"""
═══════════════════════════════════════════════════════════════════════════════
FICHES.PY — Du nom brut du modèle à une fiche agronomique en français
═══════════════════════════════════════════════════════════════════════════════

LE PROBLÈME RÉSOLU
------------------
Les modèles renvoient des étiquettes brutes : « Tomato___Late_blight »,
« Spodoptera_frugiperda », voire « class_7 ». L'application mobile devait
les traduire avec une table écrite à la main : dès qu'une classe manquait,
l'écran affichait « non reconnu » — alors que le modèle avait bien prédit.

LA SOLUTION
-----------
Le SERVEUR fabrique la fiche complète. Trois niveaux, dans l'ordre :

  1. CATALOGUE local (fiches_catalogue.json) : les maladies et ravageurs
     majeurs du Burkina Faso, rédigés et vérifiés. Réponse instantanée.
  2. ASSISTANT (Claude) : pour toute classe inconnue, génère une fiche
     structurée en français simple, adaptée au contexte sahélien.
     Le résultat est ENREGISTRÉ dans fiches_cache.json — l'appel n'a
     lieu qu'UNE fois par classe, jamais deux.
  3. REPLI honnête : si l'assistant est indisponible, une fiche minimale
     avec le nom nettoyé et un conseil générique, marquée comme telle.

GARDE-FOU DE CONFIANCE
----------------------
Sous le seuil CONFIANCE_MIN, on n'affirme rien : la fiche renvoyée dit
franchement que la photo n'est pas assez claire. Mieux vaut « reprenez la
photo » qu'un faux diagnostic — surtout devant un jury.

L'application n'a donc PLUS AUCUNE table de correspondance à maintenir.
═══════════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

ROOT = Path(__file__).resolve().parent
CATALOGUE_FILE = ROOT / "fiches_catalogue.json"
CACHE_FILE = ROOT / "fiches_cache.json"

# En dessous de ce pourcentage, on ne prétend pas savoir.
CONFIANCE_MIN = 45.0

_catalogue: Optional[Dict[str, Any]] = None
_cache: Optional[Dict[str, Any]] = None


# ─────────────────────────────────────────────────────────────────────────────
# Chargement / sauvegarde
# ─────────────────────────────────────────────────────────────────────────────

def _load_json(path: Path) -> Dict[str, Any]:
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            print(f"[FICHES] ⚠️ {path.name} illisible — ignoré.")
    return {}


def get_catalogue() -> Dict[str, Any]:
    global _catalogue
    if _catalogue is None:
        _catalogue = _load_json(CATALOGUE_FILE)
        print(f"[FICHES] Catalogue : {len(_catalogue)} fiches vérifiées.")
    return _catalogue


def get_cache() -> Dict[str, Any]:
    global _cache
    if _cache is None:
        _cache = _load_json(CACHE_FILE)
        print(f"[FICHES] Cache : {len(_cache)} fiches déjà générées.")
    return _cache


def _save_cache() -> None:
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(get_cache(), f, ensure_ascii=False, indent=2)
    except OSError as exc:
        print(f"[FICHES] ⚠️ Cache non enregistré : {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# Normalisation des noms de classes
# ─────────────────────────────────────────────────────────────────────────────

def cle(nom_classe: str) -> str:
    """Clé de recherche stable : minuscules, sans séparateurs ni accents."""
    k = nom_classe.lower()
    k = k.replace("___", "_").replace("__", "_")
    k = re.sub(r"[^a-z0-9]+", "_", k)
    return k.strip("_")


def nom_lisible(nom_classe: str) -> str:
    """« Tomato___Late_blight » → « Tomato Late blight » (repli d'affichage)."""
    n = nom_classe.replace("___", " — ").replace("_", " ").strip()
    return n[:1].upper() + n[1:] if n else "Résultat"


# ─────────────────────────────────────────────────────────────────────────────
# Génération par l'assistant (une seule fois par classe, puis mise en cache)
# ─────────────────────────────────────────────────────────────────────────────

PROMPT_FICHE = """Tu es agronome au Burkina Faso. Un modèle de reconnaissance \
d'images a identifié cette classe sur la photo d'un agriculteur :

Type : {type_libelle}
Étiquette du modèle : "{classe}"

Rédige une fiche pratique pour cet agriculteur. Réponds UNIQUEMENT avec un \
objet JSON valide, sans texte autour, sans balises Markdown, au format exact :

{{
  "nom": "nom courant en français simple",
  "nom_scientifique": "nom latin si pertinent, sinon chaîne vide",
  "cultures": ["cultures concernées"],
  "description": "2 à 3 phrases : à quoi ça ressemble, ce que ça provoque",
  "severite": "faible" ou "modéré" ou "élevé",
  "traitements": ["4 gestes concrets, dans l'ordre, réalisables au Burkina Faso"],
  "prevention": ["3 à 4 pratiques pour éviter que ça revienne"]
}}

Règles : français SIMPLE (on parle à un agriculteur, pas à un chercheur), \
gestes CONCRETS avec doses et périodes quand c'est utile, produits et \
pratiques disponibles au Burkina Faso, aucun jargon d'intelligence \
artificielle. Si l'étiquette indique une plante SAINE, dis-le clairement et \
mets "severite": "faible" avec des conseils d'entretien."""


def _generer_fiche(nom_classe: str, model_type: str, appel_llm: Callable[[str], str]) -> Optional[Dict[str, Any]]:
    """Demande une fiche à l'assistant et la valide. None si échec."""
    type_libelle = "un ravageur (insecte nuisible)" if model_type == "pest" else "une maladie de plante"
    try:
        brut = appel_llm(PROMPT_FICHE.format(type_libelle=type_libelle, classe=nom_classe))
    except Exception as exc:
        print(f"[FICHES] ⚠️ Assistant indisponible pour « {nom_classe} » : {exc}")
        return None

    # Extraction du JSON même si le modèle l'entoure de texte ou de balises
    texte = brut.strip()
    texte = re.sub(r"^```(?:json)?\s*", "", texte)
    texte = re.sub(r"\s*```$", "", texte)
    m = re.search(r"\{.*\}", texte, re.DOTALL)
    if m:
        texte = m.group(0)

    try:
        fiche = json.loads(texte)
    except json.JSONDecodeError:
        print(f"[FICHES] ⚠️ Réponse non exploitable pour « {nom_classe} ».")
        return None

    # Validation : une fiche sans traitement n'a aucune valeur pour l'agriculteur
    if not fiche.get("nom") or not fiche.get("traitements"):
        print(f"[FICHES] ⚠️ Fiche incomplète pour « {nom_classe} ».")
        return None

    fiche.setdefault("nom_scientifique", "")
    fiche.setdefault("cultures", [])
    fiche.setdefault("description", "")
    fiche.setdefault("prevention", [])
    if fiche.get("severite") not in ("faible", "modéré", "élevé"):
        fiche["severite"] = "modéré"
    fiche["source"] = "assistant"
    return fiche


def _fiche_repli(nom_classe: str, model_type: str) -> Dict[str, Any]:
    """Ni catalogue ni assistant : fiche minimale, honnête sur ses limites."""
    est_ravageur = model_type == "pest"
    return {
        "nom": nom_lisible(nom_classe),
        "nom_scientifique": "",
        "cultures": [],
        "description": (
            "Cet organisme a été identifié sur votre photo, mais la fiche "
            "détaillée n'est pas disponible hors connexion."
        ),
        "severite": "modéré",
        "traitements": [
            "Isolez les plants touchés pour éviter la propagation.",
            "Retirez et brûlez les parties atteintes.",
            (
                "Montrez la photo à un agent agricole de votre zone."
                if est_ravageur
                else "Demandez conseil à un agent agricole avant tout traitement."
            ),
        ],
        "prevention": [
            "Surveillez vos parcelles chaque semaine.",
            "Pratiquez la rotation des cultures.",
        ],
        "source": "repli",
    }


def fiche_incertaine(confiance: float, model_type: str) -> Dict[str, Any]:
    """Confiance trop basse : on ne diagnostique PAS, on demande une meilleure photo."""
    sujet = "l'insecte" if model_type == "pest" else "la feuille malade"
    return {
        "nom": "Photo peu claire",
        "nom_scientifique": "",
        "cultures": [],
        "description": (
            f"L'analyse n'est pas assez sûre pour se prononcer ({confiance:.0f} % de "
            "fiabilité). Une meilleure photo permettra un résultat fiable."
        ),
        "severite": "faible",
        "traitements": [
            f"Reprenez la photo de près, en cadrant bien {sujet}.",
            "Photographiez en pleine lumière, sans ombre portée.",
            "Évitez le flou : gardez le téléphone immobile une seconde.",
        ],
        "prevention": [],
        "source": "incertain",
        "incertain": True,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Point d'entrée : appelé par app.py après chaque prédiction
# ─────────────────────────────────────────────────────────────────────────────

def obtenir_fiche(
    nom_classe: str,
    model_type: str,
    confiance: float,
    appel_llm: Optional[Callable[[str], str]] = None,
) -> Dict[str, Any]:
    """
    Fiche agronomique complète pour une classe prédite.

    Args:
        nom_classe : étiquette brute du modèle (« Tomato___Late_blight »)
        model_type : « disease » ou « pest »
        confiance  : pourcentage de confiance de la prédiction
        appel_llm  : fonction (prompt: str) -> str, pour la génération
                     des classes inconnues. Optionnelle.
    """
    # 0. Confiance insuffisante : on ne prétend rien
    if confiance < CONFIANCE_MIN:
        print(f"[FICHES] Confiance {confiance:.1f} % < {CONFIANCE_MIN} % → fiche « photo peu claire ».")
        return fiche_incertaine(confiance, model_type)

    k = cle(nom_classe)

    # 1. Catalogue vérifié
    catalogue = get_catalogue()
    if k in catalogue:
        fiche = dict(catalogue[k])
        fiche["source"] = "catalogue"
        print(f"[FICHES] « {nom_classe} » → catalogue.")
        return fiche

    # 2. Cache des fiches déjà générées
    cache = get_cache()
    if k in cache:
        print(f"[FICHES] « {nom_classe} » → cache.")
        return dict(cache[k])

    # 3. Génération par l'assistant, puis mise en cache définitive
    if appel_llm is not None:
        print(f"[FICHES] « {nom_classe} » inconnue → génération...")
        fiche = _generer_fiche(nom_classe, model_type, appel_llm)
        if fiche:
            cache[k] = fiche
            _save_cache()
            print(f"[FICHES] Fiche « {fiche['nom']} » générée et mise en cache.")
            return fiche

    # 4. Repli honnête
    print(f"[FICHES] « {nom_classe} » → fiche de repli.")
    return _fiche_repli(nom_classe, model_type)
