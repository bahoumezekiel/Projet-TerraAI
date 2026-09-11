"""Agent de mise en relation commerciale pour TerraAI.

Aide l'agriculteur à trouver des acheteurs potentiels pour sa récolte, depuis le
chat. Il indique son produit (piment, tomate, maïs...) et sa localisation ; l'agent
cherche sur le web des débouchés à proximité — restaurants, hôtels, kiosques,
épiceries, grossistes, marchés, unités de transformation — et rapporte pour chacun
le nom, le type, la localité, l'adresse et le téléphone (quand ils sont en ligne),
avec la source.

Utilise l'outil de recherche web natif de Claude (server tool). Clé : ANTHROPIC_API_KEY.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:  # python-dotenv optionnel
    pass

import anthropic

# Le géocodage via weather.py est un CONFORT, pas une nécessité : l'agent
# fonctionne parfaitement avec la localité en texte libre. On rend donc
# l'import optionnel — sans cela, l'absence de weather.py empêchait tout le
# module de se charger, et l'assistant perdait l'outil « trouver_acheteurs ».
try:
    import weather  # réutilise resolve_location / geocode
except Exception:
    weather = None

# Modèle aligné sur celui utilisé par app.py (déjà validé sur ce serveur).
# Surchargeable sans toucher au code : variable d'environnement TERRAAI_MODEL.
MODEL = os.getenv("TERRAAI_MODELE", os.getenv("TERRAAI_MODEL", "claude-sonnet-4-6"))
# Variante récente (filtrage dynamique) ; bascule automatique si non supportée.
WEB_SEARCH_PRIMARY = "web_search_20260209"
WEB_SEARCH_FALLBACK = "web_search_20250305"
# 3 recherches web suffisent en pratique et réduisent FORTEMENT le coût :
# c'est de loin l'opération la plus consommatrice de l'application. Le cache
# côté app.py fait le reste (une même question ne coûte qu'une seule fois).
MAX_SEARCHES = 3

_CLIENT: Optional[anthropic.Anthropic] = None


class MarketAgentError(RuntimeError):
    """Erreur du système de mise en relation."""


def get_client() -> anthropic.Anthropic:
    global _CLIENT
    if _CLIENT is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise MarketAgentError("ANTHROPIC_API_KEY n'est pas configurée (voir .env)")
        _CLIENT = anthropic.Anthropic(api_key=api_key)
    return _CLIENT


SYSTEM_PROMPT = (
    "Tu es l'assistant commercial de TerraAI, au service des agriculteurs du Burkina Faso. "
    "Ta mission : trouver des ACHETEURS potentiels pour la récolte de l'agriculteur, aussi "
    "près que possible de sa localisation.\n\n"
    "Cibles à rechercher : restaurants, maquis, hôtels et auberges, kiosques et alimentations, "
    "épiceries et supérettes, marchés et grossistes de vivres, unités de transformation "
    "agroalimentaire, cantines scolaires, ONG et coopératives d'achat.\n\n"
    "Méthode : utilise la recherche web pour trouver des établissements réels près de la zone "
    "indiquée (commence par la localité même, puis élargis à la ville/région et à Ouagadougou si "
    "besoin). Privilégie ceux qui consomment ou revendent le produit concerné.\n\n"
    "Pour chaque acheteur trouvé, donne : le NOM de l'établissement, son TYPE, la LOCALITÉ, "
    "l'ADRESSE si disponible, le TÉLÉPHONE si disponible, et pourquoi il pourrait être intéressé. "
    "Indique toujours la source. Si tu ne trouves pas de coordonnées en ligne pour une zone rurale, "
    "dis-le honnêtement et propose des pistes concrètes (marché de la ville la plus proche, "
    "grossistes connus, groupements). N'invente jamais un numéro de téléphone ou une adresse : "
    "ne donne que ce que les sources confirment.\n\n"
    "Réponds en français, sous forme d'une liste claire d'acheteurs, suivie de conseils pratiques "
    "pour approcher la vente."
)


def _web_search_tool(tool_type: str) -> Dict[str, Any]:
    # Pas de user_location : le code pays "BF" n'est pas supporté par l'outil,
    # et la localité est déjà précisée dans la requête.
    return {
        "type": tool_type,
        "name": "web_search",
        "max_uses": MAX_SEARCHES,
    }


def _extract(response: Any) -> Dict[str, Any]:
    """Extrait la réponse finale et les sources web.

    On ne garde que le texte situé APRÈS la dernière recherche (la synthèse
    finale de l'agent), pas la narration intermédiaire entre les recherches.
    """
    sources: List[Dict[str, str]] = []
    seen = set()
    last_tool_idx = -1
    for i, block in enumerate(response.content):
        btype = getattr(block, "type", None)
        if btype in ("web_search_tool_result", "server_tool_use"):
            last_tool_idx = i
        if btype == "web_search_tool_result":
            content = getattr(block, "content", None)
            if isinstance(content, list):
                for result in content:
                    url = getattr(result, "url", None)
                    if url and url not in seen:
                        seen.add(url)
                        sources.append({
                            "title": getattr(result, "title", "") or url,
                            "url": url,
                        })

    tail = response.content[last_tool_idx + 1:] if last_tool_idx >= 0 else response.content
    text_parts = [b.text for b in tail if getattr(b, "type", None) == "text"]
    if not text_parts:  # repli : tout le texte si rien après les recherches
        text_parts = [b.text for b in response.content if getattr(b, "type", None) == "text"]
    return {"answer": "\n".join(text_parts).strip(), "sources": sources}


def find_buyers(
    product: str,
    location: str = "",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Dict[str, Any]:
    """Cherche des acheteurs potentiels pour un produit près d'une localisation.

    Args:
        product: le produit à vendre (ex. "piment", "tomate", "maïs").
        location: localisation en texte libre (ex. "village près de Pô").
        lat, lon: coordonnées GPS optionnelles (précisent la recherche).
    """
    if not product or not product.strip():
        raise MarketAgentError("Précise le produit à vendre")

    # Contexte de localisation : géocodage best-effort (ne bloque pas si échec).
    place_name = location.strip()
    if weather is not None:
        try:
            resolved = weather.resolve_location(lat=lat, lon=lon,
                                                region=location or None)
            if not place_name and resolved.get("name"):
                place_name = resolved["name"]
        except Exception:
            pass  # localité rurale non géocodée : on garde le texte libre

    where = place_name or (f"{lat}, {lon}" if lat is not None else "Burkina Faso")
    user_message = (
        f"Je suis agriculteur et je veux vendre ma récolte de : {product}.\n"
        f"Ma localisation : {where}.\n"
        + (f"Coordonnées GPS : {lat}, {lon}.\n" if lat is not None else "")
        + "Trouve-moi des acheteurs potentiels près de chez moi, avec leurs coordonnées "
        "(nom, type, localité, adresse, téléphone) et pourquoi ils pourraient être intéressés."
    )

    client = get_client()
    messages: List[Dict[str, Any]] = [{"role": "user", "content": user_message}]

    def run(tool_type: str) -> Any:
        tools = [_web_search_tool(tool_type)]
        # Boucle manuelle : les server tools peuvent renvoyer pause_turn.
        for _ in range(MAX_SEARCHES + 3):
            response = client.messages.create(
                model=MODEL,
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                tools=tools,
                messages=messages,
            )
            if response.stop_reason == "pause_turn":
                messages.append({"role": "assistant", "content": response.content})
                continue
            return response
        return response  # dernière réponse même si non terminée

    try:
        response = run(WEB_SEARCH_PRIMARY)
    except anthropic.APIError as exc:
        # Variante de recherche web non disponible : bascule sur la version de base.
        if "web_search" in str(exc).lower() or "tool" in str(exc).lower():
            messages = [{"role": "user", "content": user_message}]
            try:
                response = run(WEB_SEARCH_FALLBACK)
            except anthropic.APIError as exc2:
                raise MarketAgentError(f"Recherche web indisponible : {exc2}") from exc2
        else:
            raise MarketAgentError(f"Erreur de l'agent : {exc}") from exc

    result = _extract(response)
    return {
        "product": product,
        "location": where,
        "answer": result["answer"] or "Aucun acheteur trouvé pour le moment.",
        "sources": result["sources"],
        "model": MODEL,
    }


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    import sys

    if len(sys.argv) >= 3:
        prod = sys.argv[1]
        loc = " ".join(sys.argv[2:])
        res = find_buyers(prod, loc)
        print(f"\n=== Acheteurs potentiels pour {res['product']} — {res['location']} ===\n")
        print(res["answer"])
        if res["sources"]:
            print("\nSources :")
            for s in res["sources"]:
                print(f"  - {s['title']} : {s['url']}")
    else:
        print("Usage : python market_agent.py <produit> <localisation>")
        print('Exemple : python market_agent.py piment "village pres de Po"')
