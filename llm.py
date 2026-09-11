"""
═══════════════════════════════════════════════════════════════════════════════
LLM.PY — Couche unique vers Anthropic (Claude)
═══════════════════════════════════════════════════════════════════════════════

Tout ce qui demande de l'intelligence passe par ici : assistant écrit,
assistant vocal, génération des fiches agronomiques, recherche web.

CONFIGURATION — fichier .env placé À CÔTÉ de ce fichier
--------------------------------------------------------
    ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
    TERRAAI_MODELE=claude-sonnet-4-6        (facultatif)

Les variables système Windows (setx) fonctionnent également.

CE QUE CE MODULE EXPOSE
-----------------------
    disponible()            → Claude est-il utilisable ?
    etat()                  → diagnostic détaillé (pour /modules/status)
    diagnostic()            → explications en français si quelque chose manque
    appel_texte(prompt)     → une réponse texte simple
    conversation(...)       → conversation AVEC outils (appels de fonctions)
    recherche_web(...)      → recherche web + sources
    tester_recherche_web()  → vérification rapide de la recherche web

RÉSISTANCE AUX INCIDENTS
------------------------
Les erreurs passagères (500, 502, 503, 429, surcharge) déclenchent jusqu'à
3 tentatives espacées de 1 s puis 3 s. Les erreurs définitives (clé invalide,
crédit épuisé) ne sont jamais réessayées : cela ne ferait que faire patienter
l'agriculteur pour rien.

⚠️ La transcription vocale n'est PAS concernée : elle tourne en local avec
   faster-whisper, gratuitement et sans internet.
═══════════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

DOSSIER = Path(__file__).resolve().parent
FICHIER_ENV = DOSSIER / ".env"

# Le .env est cherché EXPLICITEMENT à côté de ce fichier : sans cela, il ne
# serait trouvé que si uvicorn était lancé depuis ce dossier précis.
DOTENV_INSTALLE = False
try:
    from dotenv import load_dotenv
    DOTENV_INSTALLE = True
    if FICHIER_ENV.exists():
        load_dotenv(FICHIER_ENV, override=False)
    load_dotenv(override=False)
except ImportError:
    pass

try:
    import anthropic as _anthropic
except ImportError:
    _anthropic = None


MODELE = os.getenv("TERRAAI_MODELE", "claude-sonnet-4-6")

_client: Any = None


class LLMError(RuntimeError):
    """Claude est indisponible ou a échoué."""


# ─────────────────────────────────────────────────────────────────────────────
# Disponibilité et diagnostic
# ─────────────────────────────────────────────────────────────────────────────

def disponible() -> bool:
    """Claude est-il utilisable (paquet installé + clé présente) ?"""
    return _anthropic is not None and bool(os.getenv("ANTHROPIC_API_KEY"))


def _client_anthropic() -> Any:
    """Client Anthropic, créé une seule fois puis réutilisé."""
    global _client
    if _client is None:
        if _anthropic is None:
            raise LLMError("Le paquet anthropic n'est pas installé "
                           "(pip install anthropic)")
        cle = os.getenv("ANTHROPIC_API_KEY")
        if not cle:
            raise LLMError("ANTHROPIC_API_KEY n'est pas configurée")
        _client = _anthropic.Anthropic(api_key=cle)
    return _client


def etat() -> Dict[str, Any]:
    """Diagnostic — affiché par /modules/status et au démarrage du serveur."""
    return {
        "fournisseur": "anthropic" if disponible() else None,
        "modele": MODELE,
        "paquet_installe": _anthropic is not None,
        "cle_presente": bool(os.getenv("ANTHROPIC_API_KEY")),
        "dotenv_installe": DOTENV_INSTALLE,
        "fichier_env_trouve": FICHIER_ENV.exists(),
        "chemin_env_attendu": str(FICHIER_ENV),
    }


def diagnostic() -> List[str]:
    """Explique en français clair ce qui empêche Claude de fonctionner."""
    e = etat()
    lignes: List[str] = []

    if not e["paquet_installe"]:
        lignes.append("Le paquet anthropic n'est pas installé "
                      "→ pip install anthropic")
    if not e["cle_presente"]:
        lignes.append("ANTHROPIC_API_KEY n'est pas visible "
                      "(ni .env ni variable système).")
        if not e["dotenv_installe"]:
            lignes.append("   python-dotenv absent → le .env est ignoré "
                          "(pip install python-dotenv)")
        elif not e["fichier_env_trouve"]:
            lignes.append(f"   Aucun .env à : {e['chemin_env_attendu']}")
            lignes.append("   Sous Windows, vérifiez qu'il ne s'appelle pas "
                          "« .env.txt » (les extensions sont masquées).")
    return lignes


# ─────────────────────────────────────────────────────────────────────────────
# Résistance aux incidents passagers
# ─────────────────────────────────────────────────────────────────────────────

# Codes réessayables : incidents temporaires côté serveur ou débit dépassé.
CODES_PASSAGERS = (429, 500, 502, 503, 504, 529)
NB_ESSAIS = 3
ATTENTES = (1.0, 3.0)  # secondes entre deux tentatives


def _est_passagere(exc: Exception) -> bool:
    """L'erreur a-t-elle une chance de disparaître si on réessaie ?"""
    code = getattr(exc, "status_code", None)
    if code is None:
        reponse = getattr(exc, "response", None)
        code = getattr(reponse, "status_code", None)
    if code in CODES_PASSAGERS:
        return True

    texte = str(exc).lower()
    # Erreurs DÉFINITIVES : réessayer serait une perte de temps
    if any(m in texte for m in ("credit balance", "invalid x-api-key",
                                "authentication", "permission")):
        return False
    return any(m in texte for m in ("internal server error", "overloaded",
                                    "rate limit", "timeout", "temporarily",
                                    "connection"))


def _reessayer(appel: Callable[[], Any], etiquette: str) -> Any:
    """Exécute un appel, en le réessayant si l'erreur semble passagère."""
    derniere: Optional[Exception] = None
    for essai in range(NB_ESSAIS):
        try:
            return appel()
        except Exception as exc:
            derniere = exc
            if not _est_passagere(exc) or essai == NB_ESSAIS - 1:
                raise
            attente = ATTENTES[min(essai, len(ATTENTES) - 1)]
            print(f"[LLM] {etiquette} : incident passager "
                  f"({type(exc).__name__}) — nouvel essai dans {attente:g} s "
                  f"({essai + 2}/{NB_ESSAIS})")
            time.sleep(attente)
    raise derniere  # type: ignore[misc]


def _creer(kwargs: Dict[str, Any], etiquette: str = "Claude") -> Any:
    """Appel à l'API, protégé par les réessais."""
    return _reessayer(lambda: _client_anthropic().messages.create(**kwargs),
                      etiquette)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Appel texte simple (génération des fiches agronomiques)
# ─────────────────────────────────────────────────────────────────────────────

def appel_texte(prompt: str, max_tokens: int = 1200) -> str:
    """Un aller-retour texte, sans outil."""
    if not disponible():
        raise LLMError("Claude n'est pas configuré (clé absente ou paquet manquant)")

    reponse = _creer({
        "model": MODELE,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    })
    return "".join(
        b.text for b in reponse.content if getattr(b, "type", None) == "text"
    )


# ─────────────────────────────────────────────────────────────────────────────
# 2. Conversation AVEC outils (l'assistant qui cherche des acheteurs)
# ─────────────────────────────────────────────────────────────────────────────
# Les outils sont décrits dans un format neutre, traduit ici :
#   { "nom": ..., "description": ..., "parametres": { <schéma JSON> } }

def _outil_vers_api(outil: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "name": outil["nom"],
        "description": outil["description"],
        "input_schema": outil["parametres"],
    }


def conversation(
    instructions: str,
    message: str,
    outils: Optional[List[Dict[str, Any]]] = None,
    executeur: Optional[Callable[[str, Dict[str, Any]], str]] = None,
    max_tokens: int = 2000,
    tours_max: int = 3,
) -> str:
    """
    Pose une question à l'assistant, en lui donnant éventuellement des outils.

    Args:
        instructions : le rôle et les règles de l'assistant (prompt système)
        message      : la question de l'utilisateur
        outils       : liste au format neutre { nom, description, parametres }
        executeur    : fonction (nom_outil, paramètres) -> résultat texte
        tours_max    : nombre maximal d'allers-retours d'outils

    Returns:
        Le texte de la réponse finale.
    """
    if not disponible():
        raise LLMError("Claude n'est pas configuré (clé absente ou paquet manquant)")

    outils = outils or []
    messages: List[Dict[str, Any]] = [{"role": "user", "content": message}]
    tools = [_outil_vers_api(o) for o in outils] if outils else None

    for _ in range(tours_max):
        kwargs: Dict[str, Any] = {
            "model": MODELE,
            "max_tokens": max_tokens,
            "system": instructions,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools

        reponse = _creer(kwargs)

        # L'assistant demande l'exécution d'un outil
        if reponse.stop_reason == "tool_use" and executeur is not None:
            messages.append({"role": "assistant", "content": reponse.content})
            resultats = []
            for bloc in reponse.content:
                if getattr(bloc, "type", None) == "tool_use":
                    resultats.append({
                        "type": "tool_result",
                        "tool_use_id": bloc.id,
                        "content": executeur(bloc.name, bloc.input),
                    })
            messages.append({"role": "user", "content": resultats})
            continue

        return "".join(
            b.text for b in reponse.content if getattr(b, "type", None) == "text"
        )

    return "Je n'ai pas réussi à terminer la recherche. Reformulez votre question."


# ─────────────────────────────────────────────────────────────────────────────
# 3. Recherche web avec sources (pour trouver des acheteurs)
# ─────────────────────────────────────────────────────────────────────────────

# Variantes de l'outil de recherche web : on essaie la plus récente d'abord.
OUTILS_RECHERCHE = ("web_search_20250305", "web_search_20260209")
MAX_RECHERCHES = 3  # au-delà, le coût grimpe vite pour un gain faible


def recherche_web(instructions: str, question: str,
                  max_tokens: int = 2000) -> Dict[str, Any]:
    """
    Interroge le web et renvoie { "answer": texte, "sources": [{title, url}] }.

    Si la recherche web n'est pas disponible, lève LLMError : l'appelant doit
    alors le dire honnêtement à l'agriculteur — jamais inventer un contact.
    """
    if not disponible():
        raise LLMError("Claude n'est pas configuré (clé absente ou paquet manquant)")

    client = _client_anthropic()
    derniere_erreur: Optional[Exception] = None

    for type_outil in OUTILS_RECHERCHE:
        try:
            messages: List[Dict[str, Any]] = [{"role": "user", "content": question}]
            reponse = None

            # Les recherches côté serveur peuvent renvoyer « pause_turn » :
            # il faut relancer pour laisser l'assistant continuer.
            for _ in range(MAX_RECHERCHES + 3):
                reponse = _reessayer(
                    lambda: client.messages.create(
                        model=MODELE,
                        max_tokens=max_tokens,
                        system=instructions,
                        tools=[{
                            "type": type_outil,
                            "name": "web_search",
                            "max_uses": MAX_RECHERCHES,
                        }],
                        messages=messages,
                    ),
                    f"Recherche web ({type_outil})",
                )
                if reponse.stop_reason == "pause_turn":
                    messages.append({"role": "assistant", "content": reponse.content})
                    continue
                break

            resultat = _extraire(reponse)
            if resultat["answer"]:
                print(f"[LLM] Recherche web réussie via « {type_outil} » — "
                      f"{len(resultat['sources'])} source(s)")
                return resultat
            derniere_erreur = LLMError("réponse vide")

        except Exception as exc:
            derniere_erreur = exc
            print(f"[LLM] « {type_outil} » indisponible : "
                  f"{type(exc).__name__} — {str(exc)[:120]}")
            continue

    raise LLMError(f"Recherche web indisponible : {derniere_erreur}")


def _extraire(reponse: Any) -> Dict[str, Any]:
    """Réponse finale + sources, en ignorant la narration entre recherches.

    On ne garde que le texte situé APRÈS la dernière recherche : c'est la
    synthèse de l'assistant, pas ses commentaires intermédiaires.
    """
    sources: List[Dict[str, str]] = []
    vues = set()
    dernier_outil = -1

    for i, bloc in enumerate(reponse.content):
        btype = getattr(bloc, "type", None)
        if btype in ("web_search_tool_result", "server_tool_use"):
            dernier_outil = i
        if btype == "web_search_tool_result":
            contenu = getattr(bloc, "content", None)
            if isinstance(contenu, list):
                for r in contenu:
                    url = getattr(r, "url", None)
                    if url and url not in vues:
                        vues.add(url)
                        sources.append({
                            "title": getattr(r, "title", "") or url,
                            "url": url,
                        })

    queue = reponse.content[dernier_outil + 1:] if dernier_outil >= 0 else reponse.content
    parties = [b.text for b in queue if getattr(b, "type", None) == "text"]
    if not parties:  # repli : tout le texte si rien après les recherches
        parties = [b.text for b in reponse.content
                   if getattr(b, "type", None) == "text"]

    return {"answer": "\n".join(parties).strip(), "sources": sources}


# ─────────────────────────────────────────────────────────────────────────────
# Test rapide de la recherche web (voir tester_recherche.py)
# ─────────────────────────────────────────────────────────────────────────────

def tester_recherche_web() -> Dict[str, Any]:
    """Vérifie que la recherche web fonctionne, avec une question minimale.
    Consomme un tout petit appel : à lancer une fois après configuration."""
    try:
        r = recherche_web(
            "Tu réponds en une phrase, en français.",
            "Quelle est la capitale du Burkina Faso ? Vérifie sur le web.",
            max_tokens=300,
        )
        return {
            "ok": True,
            "modele": MODELE,
            "sources": len(r.get("sources") or []),
            "extrait": (r.get("answer") or "")[:160],
        }
    except Exception as exc:
        return {"ok": False, "modele": MODELE, "erreur": str(exc)}
