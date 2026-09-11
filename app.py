"""
═══════════════════════════════════════════════════════════════════════════════
TERRAAI — API BACKEND COMPLÈTE (app.py)
═══════════════════════════════════════════════════════════════════════════════

Version fusionnée : les prédictions existantes + tous les endpoints dont
l'application mobile a besoin.

ENDPOINTS :
  GET  /                      informations de base
  GET  /health                le serveur répond-il ? (détection hors ligne)
  POST /predict/disease       photo de feuille → maladie identifiée
  POST /predict/pest          photo → ravageur identifié
  GET  /classes/{type}        classes des modèles (vérification du mapping)
  POST /chat                  question texte → réponse de l'assistant agricole
  GET  /market/prices         prix des marchés (depuis market_prices.json)
  GET  /weather               météo actuelle + 3 jours (via Open-Meteo, gratuit)

FICHIERS ATTENDUS À CÔTÉ DE CE SCRIPT :
  plante_deseases.h5          modèle maladies
  plante_pest_v2.h5           modèle ravageurs
  market_prices.json          prix des marchés (fourni, à éditer pour actualiser)
  classes_disease.json        classes du modèle maladies  ┐ générés automatiquement
  classes_pest.json           classes du modèle ravageurs ┘ au 1er lancement si
                                                            le dataset est présent

CHANGEMENTS PAR RAPPORT À LA VERSION PRÉCÉDENTE :
  • Les noms de classes sont FIGÉS dans des fichiers JSON qui voyagent avec
    les modèles : l'API fonctionne désormais sur n'importe quelle machine,
    même sans le dataset d'entraînement. (Avant : sans dataset, l'API
    renvoyait "class_0", "class_1"... et l'app ne reconnaissait plus rien.)
  • /agent/price supprimé : il cherchait des prix de produits de consommation
    en USD via DuckDuckGo — inadapté aux marchés agricoles en FCFA.
    Remplacé par /market/prices.
  • /chat : assistant agricole via Claude (ANTHROPIC_API_KEY, voir llm.py).
  • /weather ajouté : relaye Open-Meteo (gratuit, sans clé API).

LANCEMENT :
  python -m uvicorn app:app --host 0.0.0.0 --port 8000
═══════════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import io
import json
import os
import traceback
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import requests
from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from tensorflow.keras.models import load_model
import base64

# ── Couche unique vers Claude (assistant, fiches, recherche web) ──
# Configuration : ANTHROPIC_API_KEY dans le .env. Voir llm.py.
try:
    import llm
except Exception as _exc:
    llm = None
    print(f"[APP] ⚠️ Module llm indisponible ({_exc}) — assistant hors service.")

# ── Module de fiches agronomiques (transforme une classe brute en fiche FR) ──
try:
    import fiches
except Exception as _exc:  # le serveur démarre même sans lui
    fiches = None
    print(f"[APP] ⚠️ Module fiches indisponible ({_exc}) — les prédictions "
          "renverront le nom brut de la classe.")

# ── Agent de mise en relation commerciale (recherche d'acheteurs) ──
try:
    import market_agent
except Exception:
    market_agent = None

# ── Module météo avancée du binôme (alertes, abonnements) ──
try:
    import weather
except Exception:
    weather = None

# ── Agent des prix officiels SONAGESS (bulletins) ──
try:
    import prix_agent
except Exception:
    prix_agent = None

ROOT = Path(__file__).resolve().parent

DEFAULT_DISEASE_MODEL = ROOT / "plante_deseases.h5"
DEFAULT_PEST_MODEL = ROOT / "plante_pest_v2.h5"
MARKET_PRICES_FILE = ROOT / "market_prices.json"

app = FastAPI(
    title="TerraAI API",
    version="2.0.0",
    description="API complète de TerraAI : diagnostic photo, assistant agricole, prix des marchés, météo.",
)

MODEL_CACHE: Dict[str, object] = {}
CLASS_CACHE: Dict[str, List[str]] = {}


# ═══════════════════════════════════════════════════════════════════════════
# CLASSES DES MODÈLES — figées dans des fichiers JSON
# ═══════════════════════════════════════════════════════════════════════════

def discover_class_names(model_type: str) -> List[str]:
    """
    Noms des classes d'un modèle, dans cet ordre de priorité :

      1. Fichier figé classes_{type}.json — la source FIABLE, qui voyage
         avec le modèle .h5 sur n'importe quelle machine.
      2. Découverte depuis les dossiers du dataset (machine d'entraînement
         uniquement). Le résultat est alors figé automatiquement dans le
         fichier JSON pour les prochains lancements.
      3. Secours : noms génériques (l'app mobile passera en mode exemple).
    """
    # 1. Fichier figé
    frozen = ROOT / f"classes_{model_type}.json"
    if frozen.exists():
        with open(frozen, encoding="utf-8") as f:
            classes = json.load(f)
        if classes:
            return classes

    # 2. Découverte depuis le dataset
    if model_type == "pest":
        dataset_dir = ROOT / "plantes_pest" / "train"
    else:
        dataset_dir = (
            ROOT / "plantes_deseases"
            / "New Plant Diseases Dataset(Augmented)"
            / "New Plant Diseases Dataset(Augmented)" / "train"
        )

    if dataset_dir.exists():
        classes = [
            child.name
            for child in sorted(dataset_dir.iterdir(), key=lambda p: p.name)
            if child.is_dir()
        ]
        if classes:
            # Figement automatique : la prochaine machine n'aura pas
            # besoin du dataset, seulement de ce petit fichier JSON.
            with open(frozen, "w", encoding="utf-8") as f:
                json.dump(classes, f, ensure_ascii=False, indent=2)
            return classes

    # 3. Secours
    return [f"class_{i}" for i in range(38)]


def load_model_for_type(model_type: str) -> Tuple[object, List[str]]:
    """Charge (et met en cache) le modèle demandé + ses classes."""
    model_key = model_type.lower()
    if model_key not in MODEL_CACHE:
        model_path = DEFAULT_PEST_MODEL if model_key == "pest" else DEFAULT_DISEASE_MODEL
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")

        model = load_model(model_path)
        MODEL_CACHE[model_key] = model
        classes = discover_class_names(model_key)

        # Le nombre de classes DOIT correspondre à la sortie du modèle.
        # Sinon on ajuste, et surtout on ALERTE : des noms « class_N »
        # signifient que classes_{type}.json est absent — l'application
        # affichera alors « Espèce non référencée » à chaque analyse.
        try:
            nb_sorties = int(model.output_shape[-1])
        except Exception:
            nb_sorties = len(classes)

        if classes and classes[0].startswith("class_"):
            classes = [f"class_{i}" for i in range(nb_sorties)]
            print("\n" + "!" * 70)
            print(f"[CLASSES] ⚠️  MODÈLE « {model_key} » SANS NOMS DE CLASSES "
                  f"({nb_sorties} sorties).")
            print(f"[CLASSES]     Le fichier classes_{model_key}.json est introuvable")
            print("[CLASSES]     et le dataset d'entraînement n'est pas sur cette machine.")
            print("[CLASSES]     → L'app affichera « Espèce non référencée » à chaque analyse.")
            print(f"[CLASSES]     SOLUTION : demandez au binôme la liste des {nb_sorties} classes")
            print(f"[CLASSES]     du modèle et créez classes_{model_key}.json (tableau JSON).")
            print("!" * 70 + "\n")
        elif len(classes) != nb_sorties:
            print(f"[CLASSES] ⚠️ {len(classes)} noms pour {nb_sorties} sorties "
                  f"({model_key}) — vérifiez classes_{model_key}.json !")

        CLASS_CACHE[model_key] = classes

    return MODEL_CACHE[model_key], CLASS_CACHE[model_key]


def preprocess_image(image_bytes: bytes, target_size: Tuple[int, int] = (224, 224)) -> np.ndarray:
    """Image brute → tenseur normalisé prêt pour le modèle."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize(target_size)
    array = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(array, axis=0)


def appel_llm_simple(prompt: str) -> str:
    """Un aller-retour texte avec l'assistant, quel que soit le fournisseur.
    Sert au module fiches pour générer la fiche des classes inconnues."""
    if llm is None:
        raise RuntimeError("Module llm indisponible")
    return llm.appel_texte(prompt, max_tokens=1200)


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS DE BASE
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/")
def root() -> Dict[str, str]:
    return {"message": "TerraAI API is running", "docs": "/docs"}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


# ═══════════════════════════════════════════════════════════════════════════
# PRÉDICTIONS (photo → analyse)
# ═══════════════════════════════════════════════════════════════════════════
# L'app mobile envoie un champ multipart nommé "file" et attend :
#   { model_type, prediction, confidence (en %), top_predictions: [...] }
# NE PAS changer ce format sans mettre à jour l'app mobile.

# ── Prédictions en BASE64/JSON (utilisées par l'app mobile) ──
# Même cure que le vocal : le multipart FormData échoue sur certains
# appareils React Native. Les endpoints multipart restent pour /docs.

class ImageB64Request(BaseModel):
    """Photo envoyée par l'application mobile, encodée en base64."""
    image_b64: str
    filename: Optional[str] = "photo.jpg"


def _run_prediction_bytes(image_bytes: bytes, model_type: str) -> Dict[str, object]:
    """Cœur de la prédiction, à partir des octets de l'image."""
    try:
        model, class_names = load_model_for_type(model_type)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    try:
        image_array = preprocess_image(image_bytes)
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not process image: {exc}") from exc

    predictions = model.predict(image_array, verbose=0)[0]
    top_index = int(np.argmax(predictions))
    confidence = float(predictions[top_index])
    label = class_names[top_index] if top_index < len(class_names) else f"class_{top_index}"

    ranked = []
    for index, prob in sorted(enumerate(predictions), key=lambda item: item[1], reverse=True)[:5]:
        class_name = class_names[index] if index < len(class_names) else f"class_{index}"
        ranked.append({"class_name": class_name, "confidence": round(float(prob) * 100, 2)})

    conf_pct = round(confidence * 100, 2)
    print(f"[PREDICT] {model_type} : {label} ({conf_pct} %)")

    resultat: Dict[str, object] = {
        "model_type": model_type,
        "prediction": label,
        "confidence": conf_pct,
        "top_predictions": ranked,
    }

    # ── LA FICHE : c'est elle que l'application affiche ──
    # Le serveur traduit l'étiquette brute du modèle en fiche française
    # complète (catalogue vérifié → cache → génération → repli). L'app n'a
    # donc plus AUCUNE table de correspondance à tenir à jour, et ne peut
    # plus afficher « non reconnu » alors que le modèle a bien prédit.
    if fiches is not None:
        try:
            resultat["fiche"] = fiches.obtenir_fiche(
                nom_classe=label,
                model_type=model_type,
                confiance=conf_pct,
                appel_llm=appel_llm_simple,
            )
        except Exception as exc:
            print(f"[PREDICT] ⚠️ Fiche indisponible : {exc}")

    return resultat


@app.post("/predict/disease-b64")
async def predict_disease_b64(request: ImageB64Request = Body(...)) -> Dict[str, object]:
    """Photo de feuille (base64/JSON) → maladie identifiée."""
    try:
        image_bytes = base64.b64decode(request.image_b64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Image base64 invalide: {exc}") from exc
    print(f"[PREDICT] disease-b64 : {request.filename} ({len(image_bytes)} octets)")
    return _run_prediction_bytes(image_bytes, "disease")


@app.post("/predict/pest-b64")
async def predict_pest_b64(request: ImageB64Request = Body(...)) -> Dict[str, object]:
    """Photo d'insecte (base64/JSON) → ravageur identifié."""
    try:
        image_bytes = base64.b64decode(request.image_b64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Image base64 invalide: {exc}") from exc
    print(f"[PREDICT] pest-b64 : {request.filename} ({len(image_bytes)} octets)")
    return _run_prediction_bytes(image_bytes, "pest")


async def run_prediction(file: UploadFile, model_type: str) -> Dict[str, object]:
    """Version multipart (tests via /docs) : délègue au cœur factorisé."""
    return _run_prediction_bytes(await file.read(), model_type)


@app.post("/predict/disease")
async def predict_disease(file: UploadFile = File(...)) -> Dict[str, object]:
    return await run_prediction(file, "disease")


@app.post("/predict/pest")
async def predict_pest(file: UploadFile = File(...)) -> Dict[str, object]:
    return await run_prediction(file, "pest")


@app.get("/classes/{model_type}")
def list_classes(model_type: str) -> Dict[str, object]:
    """Classes exactes d'un modèle ('disease' ou 'pest'). Sert à vérifier
    la table de correspondance (aiMapping.ts) côté application mobile."""
    if model_type not in ("disease", "pest"):
        raise HTTPException(status_code=400, detail="model_type doit être 'disease' ou 'pest'")
    _, class_names = load_model_for_type(model_type)
    generique = bool(class_names) and class_names[0].startswith("class_")
    return {
        "model_type": model_type,
        "count": len(class_names),
        "classes": class_names,
        "noms_reels": not generique,
        "avertissement": (
            f"Noms de classes ABSENTS : créez classes_{model_type}.json "
            f"(tableau JSON de {len(class_names)} noms, dans l'ordre du modèle)."
        ) if generique else None,
    }


# ═══════════════════════════════════════════════════════════════════════════
# ASSISTANT AGRICOLE — POST /chat
# ═══════════════════════════════════════════════════════════════════════════
# Requête de l'app : { "message": "...", "region": "...?", "cultures": [...]? }
# Réponse attendue : { "response": "..." }

class ChatRequest(BaseModel):
    message: str
    region: Optional[str] = None
    cultures: Optional[List[str]] = None


# Le ton et les limites de l'assistant vivent ICI, côté serveur :
# on peut les ajuster sans re-livrer l'application mobile.
ASSISTANT_SYSTEM_PROMPT = """Tu es l'assistant agricole de TerraAI, une application \
mobile pour les agriculteurs du Burkina Faso.

Règles de réponse :
- Réponds en français SIMPLE et direct, comme on parle à un agriculteur, \
jamais comme un article scientifique.
- Sois CONCRET : quantités, périodes, gestes précis adaptés au climat \
sahélien et aux pratiques du Burkina Faso.
- Reste COURT : 4 à 8 phrases maximum. Utilise des listes à puces si \
plusieurs étapes.
- Domaines couverts : cultures (mil, sorgho, maïs, riz, niébé, arachide, \
soja, sésame, coton, tomate, oignon, gombo), maladies, ravageurs, engrais, \
semis, récolte, conservation, météo agricole, prix et vente.
- Si la question sort de l'agriculture, ramène poliment vers ton domaine.
- Ne mentionne JAMAIS de termes techniques d'intelligence artificielle \
(noms de modèles, etc.).
- N'utilise JAMAIS de mise en forme Markdown : pas de dièses (##), pas \
d'astérisques (**gras**), pas de titres. Écris en texte simple, avec des \
tirets « - » pour les listes. L'application affiche du texte brut."""


# ── Instructions AJOUTÉES seulement si l'outil est réellement disponible ──
CONSIGNE_OUTIL_DISPONIBLE = """
- Si l'agriculteur cherche OÙ VENDRE sa récolte, à qui la vendre, ou demande \
des acheteurs, des clients ou des débouchés : appelle l'outil trouver_acheteurs. \
N'annonce pas que tu vas l'appeler, APPELLE-LE directement. N'invente jamais un \
nom d'acheteur ni un numéro de téléphone."""

# ── Instructions de repli quand l'outil est ABSENT du serveur ──
# Sans cette précision, l'assistant à qui l'on a parlé d'un outil qu'il n'a pas
# se met à ÉCRIRE « [Appel de l'outil ...] » dans sa réponse : le pire des
# comportements, car l'agriculteur voit de la mécanique interne.
CONSIGNE_SANS_OUTIL = """
- Tu n'as AUCUN outil de recherche. N'écris JAMAIS « [Appel de l'outil... ] », \
ni aucune mention d'outil, de fonction ou de recherche en cours : l'agriculteur \
ne doit jamais voir de mécanique interne.
- Si on te demande où vendre une récolte, réponds avec des conseils concrets \
et généraux (marché de la ville la plus proche, groupements de producteurs, \
coopératives, grossistes de vivres, transformateurs locaux), et précise \
honnêtement que tu ne peux pas donner de contacts précis pour le moment."""


def prompt_assistant() -> str:
    """Instructions de l'assistant, adaptées aux outils RÉELLEMENT présents."""
    if _recherche_acheteurs_possible():
        return ASSISTANT_SYSTEM_PROMPT + CONSIGNE_OUTIL_DISPONIBLE
    return ASSISTANT_SYSTEM_PROMPT + CONSIGNE_SANS_OUTIL


def strip_tool_narration(text: str) -> str:
    """Filet de sécurité : efface toute narration d'outil qui aurait fui.

    Même bien instruit, un modèle peut écrire « [Appel de l'outil X...] ».
    L'agriculteur ne doit JAMAIS voir ça : on supprime ces passages avant
    d'envoyer la réponse à l'application.
    """
    import re as _re
    cleaned = _re.sub(r"\[[^\]]*\b(?:appel|outil|tool|fonction|function)\b[^\]]*\]",
                      "", text, flags=_re.IGNORECASE)
    cleaned = _re.sub(r"^\s*(?:je vais|laisse-moi)\s+(?:utiliser|appeler|lancer)\s+"
                      r"(?:l'|le |la )?(?:outil|fonction|recherche)[^\n]*\n?",
                      "", cleaned, flags=_re.IGNORECASE | _re.MULTILINE)
    cleaned = _re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def strip_markdown(text: str) -> str:
    """Filet de sécurité : efface le Markdown résiduel avant l'envoi à l'app.

    Les bulles de l'application mobile affichent du TEXTE BRUT : sans ce
    nettoyage, un « ## Titre » ou un « **gras** » s'afficherait tel quel
    à l'écran de l'agriculteur. Le prompt interdit déjà le Markdown ;
    cette fonction garantit le résultat même si le modèle en glisse.
    """
    import re as _re
    cleaned = text
    cleaned = _re.sub(r"^#{1,6}\s*", "", cleaned, flags=_re.MULTILINE)  # ## Titres
    cleaned = _re.sub(r"\*\*(.+?)\*\*", r"\1", cleaned)                  # **gras**
    cleaned = _re.sub(r"__(.+?)__", r"\1", cleaned)                      # __gras__
    cleaned = _re.sub(r"(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)", r"\1", cleaned)  # *italique*
    cleaned = _re.sub(r"`([^`]*)`", r"\1", cleaned)                      # `code`
    cleaned = _re.sub(r"^\s*[•*]\s+", "- ", cleaned, flags=_re.MULTILINE)  # puces → tirets
    cleaned = _re.sub(r"\n{3,}", "\n\n", cleaned)                        # lignes vides en trop
    return cleaned.strip()




# ─────────────────────────────────────────────────────────────────────────────
# L'OUTIL « TROUVER DES ACHETEURS » — l'assistant devient commercial
# ─────────────────────────────────────────────────────────────────────────────
# Quand l'agriculteur écrit « je veux vendre mon piment à Pô », l'assistant
# ne répond plus de mémoire : il APPELLE market_agent, qui cherche sur le web
# des acheteurs réels près de chez lui (restaurants, grossistes, marchés...)
# avec leurs coordonnées et les sources. C'est l'agent écrit par le binôme,
# branché directement dans la conversation.

OUTIL_ACHETEURS = {
    "nom": "trouver_acheteurs",
    "description": (
        "Trouve des acheteurs RÉELS pour la récolte d'un agriculteur près de sa "
        "localisation (restaurants, maquis, hôtels, épiceries, grossistes, marchés, "
        "unités de transformation), avec nom, type, localité, adresse et téléphone "
        "quand ils existent en ligne. Utilise cet outil DÈS QUE l'agriculteur "
        "cherche où vendre, à qui vendre, ou demande des acheteurs / débouchés / "
        "clients pour un produit. Ne réponds jamais de mémoire sur ce sujet."
    ),
    "parametres": {
        "type": "object",
        "properties": {
            "produit": {
                "type": "string",
                "description": "Le produit à vendre (piment, tomate, maïs, sésame...)",
            },
            "localisation": {
                "type": "string",
                "description": "Localité ou région de l'agriculteur (ex. « Pô », « Bobo-Dioulasso »)",
            },
        },
        "required": ["produit"],
    },
}


# Instructions données à l'agent commercial lors de la recherche web
INSTRUCTIONS_ACHETEURS = (
    "Tu es l'assistant commercial de TerraAI, au service des agriculteurs du "
    "Burkina Faso. Ta mission : trouver des ACHETEURS potentiels pour la récolte, "
    "aussi près que possible de la localisation indiquée.\n\n"
    "Cibles : restaurants, maquis, hôtels et auberges, kiosques et alimentations, "
    "épiceries et supérettes, marchés et grossistes de vivres, unités de "
    "transformation agroalimentaire, cantines scolaires, ONG et coopératives.\n\n"
    "Pour chaque acheteur : NOM, TYPE, LOCALITÉ, ADRESSE et TÉLÉPHONE si "
    "disponibles en ligne, et pourquoi il pourrait être intéressé. Indique les "
    "sources. Si aucune coordonnée n'existe en ligne pour une zone rurale, dis-le "
    "honnêtement et propose des pistes concrètes (marché de la ville la plus "
    "proche, grossistes connus, groupements). N'INVENTE JAMAIS un numéro de "
    "téléphone ni une adresse : ne donne que ce que les sources confirment.\n\n"
    "Réponds en français, par une liste claire d'acheteurs suivie de conseils "
    "pratiques pour aborder la vente."
)


def _recherche_acheteurs_possible() -> bool:
    """La recherche d'acheteurs peut-elle aboutir ?

    Deux chemins possibles : le module market_agent (l'agent dédié, éprouvé
    en conditions réelles) ou la recherche web de la couche llm. Les deux
    exigent une clé Claude valide."""
    if llm is None or not llm.disponible():
        return False
    return True


def _chercher_acheteurs(produit: str, lieu: str) -> Dict[str, Any]:
    """Lance la recherche par le meilleur chemin disponible."""
    question = (
        f"Je suis agriculteur au Burkina Faso et je veux vendre ma récolte de : {produit}.\n"
        f"Ma localisation : {lieu}.\n"
        "Trouve-moi des acheteurs potentiels près de chez moi, avec leurs "
        "coordonnées (nom, type, localité, adresse, téléphone) et pourquoi ils "
        "pourraient être intéressés."
    )

    # 1. L'agent dédié (market_agent.py) : éprouvé en conditions réelles,
    #    c'est lui qui a trouvé 54 sources lors de nos tests.
    if market_agent is not None:
        try:
            return market_agent.find_buyers(product=produit, location=lieu)
        except Exception as exc:
            print(f"[OUTIL] market_agent en échec ({exc}) — repli sur llm")

    # 2. Repli : la recherche web de la couche llm
    if llm is not None:
        r = llm.recherche_web(INSTRUCTIONS_ACHETEURS, question)
        r["model"] = llm.etat().get("modele")
        r["product"] = produit
        r["location"] = lieu
        return r

    raise RuntimeError("Aucun moyen de recherche d'acheteurs disponible")


# ─────────────────────────────────────────────────────────────────────────────
# CACHE DES RECHERCHES D'ACHETEURS — l'économie décisive
# ─────────────────────────────────────────────────────────────────────────────
# Une recherche d'acheteurs mobilise plusieurs recherches web : c'est de loin
# l'opération la plus coûteuse de l'application. Or en démonstration, on repose
# souvent LA MÊME question (« vendre du mil dans la Boucle du Mouhoun »).
#
# Chaque résultat est donc enregistré dans acheteurs_cache.json : la deuxième
# fois, la réponse est instantanée et NE COÛTE RIEN.
#
# ★ AVANT UNE DÉMONSTRATION : posez une fois chacune des questions que vous
#   allez montrer. Elles seront en cache — immédiates, gratuites, et à l'abri
#   d'une panne de réseau ou d'un crédit épuisé.

ACHETEURS_CACHE_FILE = ROOT / "acheteurs_cache.json"
_acheteurs_cache: Optional[Dict[str, Any]] = None


def _cle_recherche(produit: str, lieu: str) -> str:
    """Clé stable : « mil|boucle du mouhoun »."""
    return f"{produit.strip().lower()}|{lieu.strip().lower()}"


def _charger_cache_acheteurs() -> Dict[str, Any]:
    global _acheteurs_cache
    if _acheteurs_cache is None:
        if ACHETEURS_CACHE_FILE.exists():
            try:
                with open(ACHETEURS_CACHE_FILE, encoding="utf-8") as f:
                    _acheteurs_cache = json.load(f)
            except json.JSONDecodeError:
                _acheteurs_cache = {}
        else:
            _acheteurs_cache = {}
        print(f"[ACHETEURS] Cache : {len(_acheteurs_cache)} recherche(s) enregistrée(s).")
    return _acheteurs_cache


def _enregistrer_cache_acheteurs(cle: str, answer: str, sources: List[Dict[str, str]]) -> None:
    cache = _charger_cache_acheteurs()
    cache[cle] = {"answer": answer, "sources": sources}
    try:
        with open(ACHETEURS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except OSError as exc:
        print(f"[ACHETEURS] ⚠️ Cache non enregistré : {exc}")


_DERNIERES_SOURCES: List[Dict[str, str]] = []
# Réponse BRUTE du dernier outil : si l'assistant n'arrive pas à la mettre en
# forme (surcharge de l'API, limite de débit...), on l'envoie telle quelle
# plutôt que de perdre une recherche web de 50 sources.
_DERNIER_RESULTAT_BRUT: str = ""


def _executer_outil(nom: str, params: Dict[str, Any], region_defaut: Optional[str]) -> str:
    """Exécute un outil demandé par l'assistant et renvoie son résultat.

    Le texte renvoyé ici est une DONNÉE, pas une consigne de style : il
    provient de la recherche web réelle effectuée par market_agent. On
    l'encadre d'instructions strictes pour que l'assistant le restitue
    fidèlement — noms, adresses et téléphones ne doivent être ni
    reformulés, ni complétés, ni inventés.
    """
    global _DERNIERES_SOURCES, _DERNIER_RESULTAT_BRUT

    if nom == "trouver_acheteurs":
        if not _recherche_acheteurs_possible():
            return ("INDISPONIBLE : la recherche d'acheteurs n'est pas installée sur "
                    "ce serveur. Dis-le honnêtement à l'agriculteur et propose des "
                    "pistes générales, sans donner aucun contact précis.")

        produit = str(params.get("produit", "")).strip()
        lieu = str(params.get("localisation") or region_defaut or "Burkina Faso").strip()
        print(f"[OUTIL] trouver_acheteurs — produit « {produit} », zone « {lieu} »")

        # ── Déjà cherché ? Réponse immédiate et gratuite ──
        cle = _cle_recherche(produit, lieu)
        cache = _charger_cache_acheteurs()
        if cle in cache:
            resultat = dict(cache[cle])
            print(f"[OUTIL] ✓ CACHE — aucune recherche web, aucun coût "
                  f"({len(resultat.get('sources') or [])} sources mémorisées)")
        else:
            try:
                resultat = _chercher_acheteurs(produit, lieu)
            except Exception as exc:
                message = str(exc)
                print(f"[OUTIL] ❌ Échec de la recherche : {message}")
                if "credit balance" in message.lower():
                    return ("SERVICE INDISPONIBLE : le crédit du service de recherche "
                            "est épuisé. Dis à l'agriculteur que la recherche "
                            "d'acheteurs est momentanément indisponible et propose des "
                            "pistes générales (marché de la ville la plus proche, "
                            "groupements de producteurs, grossistes de vivres). "
                            "N'invente aucun contact.")
                return (f"ÉCHEC de la recherche web ({message}). Explique honnêtement à "
                        "l'agriculteur que la recherche n'a pas abouti et propose des "
                        "pistes générales. N'invente aucun contact.")
            # Nouvelle recherche réussie : on la mémorise pour toujours
            if (resultat.get("answer") or "").strip():
                _enregistrer_cache_acheteurs(
                    cle, resultat["answer"], resultat.get("sources") or []
                )
                print("[OUTIL] Recherche enregistrée au cache — gratuite la prochaine fois.")

        texte = (resultat.get("answer") or "").strip()
        sources = resultat.get("sources") or []
        _DERNIERES_SOURCES = sources
        _DERNIER_RESULTAT_BRUT = texte

        # Un résultat très long coûte cher au deuxième appel (et peut le faire
        # échouer). On le borne : l'essentiel est en tête de réponse.
        LIMITE = 4500
        if len(texte) > LIMITE:
            texte = texte[:LIMITE].rsplit("\n", 1)[0] + "\n[...]"
            print(f"[OUTIL] Résultat tronqué à {LIMITE} caractères pour la rédaction.")

        # PREUVE dans le terminal : le nombre de sources web réellement
        # consultées. Zéro source = aucune recherche n'a eu lieu.
        print(f"[OUTIL] ✓ {len(sources)} source(s) web consultée(s) "
              f"· modèle {resultat.get('model')} · {len(texte)} caractères")
        for s in sources[:5]:
            print(f"[OUTIL]     · {s.get('title', '')[:60]} — {s.get('url', '')[:70]}")

        if not texte:
            return ("La recherche n'a donné aucun résultat exploitable. Dis-le "
                    "honnêtement et propose des pistes générales.")

        liste_sources = "\n".join(
            f"- {s.get('title', '')} : {s.get('url', '')}" for s in sources[:8]
        )

        return (
            "RÉSULTAT RÉEL DE LA RECHERCHE WEB — à restituer fidèlement.\n\n"
            "Règles impératives pour ta réponse :\n"
            "- Recopie les NOMS, ADRESSES et TÉLÉPHONES EXACTEMENT tels qu'ils "
            "apparaissent ci-dessous. Ne les reformule pas, ne les complète pas.\n"
            "- N'ajoute AUCUN acheteur, adresse ou numéro qui ne figure pas ici.\n"
            "- Si aucun contact précis n'a été trouvé, dis-le franchement et "
            "reprends les pistes proposées ci-dessous.\n"
            "- Termine par un conseil pratique pour aborder la vente.\n\n"
            "───── DONNÉES ─────\n"
            f"{texte}\n\n"
            f"───── SOURCES CONSULTÉES ({len(sources)}) ─────\n{liste_sources}"
        )

    return f"Outil inconnu : {nom}"


def repondre_assistant(
    message: str,
    region: Optional[str] = None,
    cultures: Optional[str] = None,
) -> str:
    """LE cœur de l'assistant, partagé par le chat ÉCRIT et le chat VOCAL.

    Passe par la couche llm (Claude), outils compris (recherche
    d'acheteurs). Si la rédaction finale échoue
    alors qu'une recherche a déjà abouti, on renvoie le résultat brut de
    l'agent plutôt que de perdre le travail.
    """
    global _DERNIERES_SOURCES, _DERNIER_RESULTAT_BRUT
    _DERNIERES_SOURCES = []      # pas de sources d'un échange précédent
    _DERNIER_RESULTAT_BRUT = ""

    if llm is None:
        raise RuntimeError("Module llm indisponible")

    context_parts = []
    if region:
        context_parts.append(f"Région de l'utilisateur : {region}.")
    if cultures:
        context_parts.append(f"Cultures suivies : {cultures}.")
    context = (" ".join(context_parts) + "\n\n") if context_parts else ""

    # L'outil n'est proposé que si la recherche d'acheteurs est possible
    outils = [OUTIL_ACHETEURS] if _recherche_acheteurs_possible() else []

    try:
        return llm.conversation(
            instructions=prompt_assistant(),
            message=context + message,
            outils=outils,
            executeur=lambda nom, params: _executer_outil(nom, params, region),
            max_tokens=2000,
        )
    except Exception:
        traceback.print_exc()
        if _DERNIER_RESULTAT_BRUT:
            print("[ASSISTANT] ⚠️ Rédaction impossible → réponse brute de l'outil.")
            return _DERNIER_RESULTAT_BRUT
        raise


@app.post("/chat")
async def chat(request: ChatRequest = Body(...)) -> Dict[str, object]:
    """Question texte → réponse de l'assistant agricole (avec outils)."""
    try:
        cultures = ", ".join(request.cultures) if request.cultures else None
        text = repondre_assistant(request.message, request.region, cultures)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        print("[CHAT] ❌ Échec de l'assistant :")
        traceback.print_exc()
        # Crédit API épuisé : message CLAIR et actionnable plutôt qu'une
        # erreur technique incompréhensible pour l'agriculteur.
        if "credit balance" in str(exc).lower():
            raise HTTPException(
                status_code=503,
                detail=("L'assistant est momentanément indisponible (crédit du "
                        "service épuisé). Réessayez plus tard."),
            ) from exc
        raise HTTPException(status_code=502, detail=f"Assistant indisponible: {exc}") from exc

    reponse: Dict[str, object] = {"response": strip_tool_narration(strip_markdown(text))}
    # Les sources web de la recherche d'acheteurs, s'il y en a eu : elles
    # permettent de VÉRIFIER que la réponse vient bien du web et non du modèle.
    if _DERNIERES_SOURCES:
        reponse["sources"] = _DERNIERES_SOURCES[:8]
    return reponse


# ─────────────────────────────────────────────────────────────────────────────
# Recherche d'acheteurs en accès direct (hors conversation)
# ─────────────────────────────────────────────────────────────────────────────

class AcheteursRequest(BaseModel):
    produit: str
    localisation: str = ""


@app.post("/market/buyers")
def market_buyers(request: AcheteursRequest = Body(...)) -> Dict[str, Any]:
    """Acheteurs potentiels pour une récolte près d'une localisation.
    Corps : {"produit": "piment", "localisation": "Pô"}"""
    if not _recherche_acheteurs_possible():
        raise HTTPException(status_code=503, detail="Recherche d'acheteurs indisponible")
    try:
        return _chercher_acheteurs(
            request.produit,
            request.localisation or "Burkina Faso",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Recherche impossible : {exc}") from exc


# ─────────────────────────────────────────────────────────────────────────────
# Prix officiels SONAGESS (module prix_agent du binôme, si présent)
# ─────────────────────────────────────────────────────────────────────────────

class PrixQuestionRequest(BaseModel):
    question: str


@app.post("/prices/ask")
def prices_ask(request: PrixQuestionRequest = Body(...)) -> Dict[str, Any]:
    """Question libre sur les prix officiels (ex. « prix du maïs à Ouaga »)."""
    if prix_agent is None:
        raise HTTPException(status_code=503, detail="Module prix_agent indisponible")
    try:
        return prix_agent.ask(request.question)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/prices/sync")
def prices_sync() -> Dict[str, Any]:
    """Télécharge et indexe les derniers bulletins SONAGESS."""
    if prix_agent is None:
        raise HTTPException(status_code=503, detail="Module prix_agent indisponible")
    try:
        return prix_agent.sync_bulletins()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────────────────
# ALERTES MÉTÉO AVANCÉES (module weather.py du binôme)
# ─────────────────────────────────────────────────────────────────────────────
# Ces endpoints viennent du travail du binôme et sont CONSERVÉS tels quels :
# prévisions détaillées, évaluation des risques (inondation, vent, sécheresse)
# et abonnements aux notifications. Ils coexistent avec notre GET /weather
# (météo simple d'accueil, relais Open-Meteo) — aucun ne remplace l'autre.

class AbonneRequest(BaseModel):
    name: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    region: Optional[str] = None
    pushover_user: Optional[str] = None


def _exiger_weather() -> Any:
    if weather is None:
        raise HTTPException(status_code=503, detail="Module weather indisponible")
    return weather


@app.get("/weather/forecast")
def weather_forecast(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    region: Optional[str] = None,
) -> Dict[str, Any]:
    """Prévisions météo détaillées (GPS ou nom de région)."""
    w = _exiger_weather()
    try:
        location = w.resolve_location(lat=lat, lon=lon, region=region)
        daily = w.get_forecast(location["lat"], location["lon"])
        return {"location": location, "forecast": daily}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/weather/alerts")
def weather_alerts(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    region: Optional[str] = None,
    notify: bool = False,
) -> Dict[str, Any]:
    """Risques météo (inondation, vent, sécheresse) pour une localisation."""
    w = _exiger_weather()
    try:
        report = w.build_report(lat=lat, lon=lon, region=region)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if notify and report.get("has_alerts"):
        report["notified"] = w.notify_report(report)
    return report


@app.post("/weather/subscribe")
def weather_subscribe(request: AbonneRequest = Body(...)) -> Dict[str, Any]:
    """Abonne un agriculteur aux alertes automatiques."""
    w = _exiger_weather()
    try:
        subscriber = w.add_subscriber(
            name=request.name, lat=request.lat, lon=request.lon,
            region=request.region, pushover_user=request.pushover_user,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"subscribed": True, "subscriber": subscriber}


@app.get("/weather/subscribers")
def weather_subscribers() -> Dict[str, Any]:
    w = _exiger_weather()
    subscribers = w.load_subscribers()
    return {"count": len(subscribers), "subscribers": subscribers}


@app.delete("/weather/subscribers/{subscriber_id}")
def weather_unsubscribe(subscriber_id: str) -> Dict[str, Any]:
    w = _exiger_weather()
    if not w.remove_subscriber(subscriber_id):
        raise HTTPException(status_code=404, detail="Abonné introuvable")
    return {"removed": True, "id": subscriber_id}


@app.get("/prices/bulletins")
def prices_bulletins() -> Dict[str, Any]:
    """Bulletins SONAGESS actuellement indexés."""
    if prix_agent is None:
        raise HTTPException(status_code=503, detail="Module prix_agent indisponible")
    manifest = prix_agent.load_manifest()
    return {
        "count": len(manifest),
        "bulletins": [
            {"label": e["label"], "type": e["type"], "filename": e["filename"]}
            for e in manifest
        ],
    }


@app.post("/predict")
async def predict_image(file: UploadFile = File(...)) -> Dict[str, object]:
    """Alias historique de /predict/disease (conservé pour compatibilité)."""
    return await run_prediction(file, "disease")


@app.get("/modules/status")
def modules_status() -> Dict[str, object]:
    """État des modules optionnels — à ouvrir dans le navigateur pour savoir
    ce qui est réellement actif : http://localhost:8000/modules/status"""
    return {
        "llm": llm.etat() if llm is not None else None,
        "fiches": fiches is not None,
        "recherche_acheteurs": _recherche_acheteurs_possible(),
        "market_agent": market_agent is not None,
        "prix_agent": prix_agent is not None,
        "weather_avance": weather is not None,
        "whisper": WhisperModel is not None,
    }


# ═══════════════════════════════════════════════════════════════════════════
# MOTEUR VOCAL — imports + modèle Whisper (transcription locale, gratuite)
# ═══════════════════════════════════════════════════════════════════════════

import tempfile
import threading
import traceback

from fastapi import Form

try:
    from faster_whisper import WhisperModel
except ImportError:  # /chat/voice renverra 503 si absent
    WhisperModel = None

# Le modèle est chargé UNE fois puis gardé en mémoire (comme les .h5)
_WHISPER: Any = None
_WHISPER_LOCK = threading.Lock()

# Taille du modèle : "small" = bon français, "base" = plus léger/rapide
WHISPER_SIZE = "small"


def get_whisper() -> Any:
    """Charge le modèle de transcription (une seule fois, thread-safe)."""
    global _WHISPER
    if WhisperModel is None:
        raise RuntimeError("faster-whisper n'est pas installé (pip install faster-whisper)")
    with _WHISPER_LOCK:
        if _WHISPER is None:
            print("[VOCAL] Chargement du modèle Whisper "
                  f"'{WHISPER_SIZE}' (téléchargement au premier lancement)...")
            _WHISPER = WhisperModel(WHISPER_SIZE, device="cpu", compute_type="int8")
            print("[VOCAL] Modèle Whisper chargé et prêt.")
    return _WHISPER


@app.on_event("startup")
def preload_whisper() -> None:
    """Précharge le modèle au démarrage (en arrière-plan) pour que le
    PREMIER vocal ne subisse pas le temps de chargement."""
    if WhisperModel is not None:
        threading.Thread(target=lambda: get_whisper(), daemon=True).start()
    else:
        print("[VOCAL] ⚠️ faster-whisper NON installé — /chat/voice répondra 503. "
              "Corriger avec : pip install faster-whisper")


@app.on_event("startup")
def bilan_modules() -> None:
    """Affiche au démarrage ce qui est réellement actif — évite de chercher
    pendant une heure pourquoi une fonctionnalité ne répond pas."""
    print("\n" + "=" * 60)
    print("  TERRAAI — MODULES")
    print("=" * 60)
    # Bilan TOLÉRANT : quelle que soit la version de llm.py présente, un
    # affichage de diagnostic ne doit JAMAIS empêcher le serveur de démarrer.
    if llm is not None:
        try:
            e = llm.etat() or {}
            f = e.get("fournisseur")
            print(f"  Intelligence : {'Claude' if f else 'INDISPONIBLE'}"
                  f"   Modèle : {e.get('modele')}")
            print(f"  Clé ANTHROPIC_API_KEY : "
                  f"{'présente' if e.get('cle_presente') else 'ABSENTE'}")
            if "fichier_env_trouve" in e:
                print(f"  Fichier .env   → {'trouvé' if e.get('fichier_env_trouve') else 'absent'}"
                      f"   (python-dotenv : {'installé' if e.get('dotenv_installe') else 'absent'})")
            # diagnostic() n'existe que dans les versions récentes de llm.py
            details = getattr(llm, "diagnostic", None)
            if callable(details):
                for ligne in details():
                    print(f"  ⚠️  {ligne}")
        except Exception as exc:
            print(f"  ⚠️ Bilan du fournisseur indisponible : {exc}")
        print("-" * 60)

    etats = [
        ("Fiches agronomiques", fiches is not None, "fiches.py"),
        ("Recherche d'acheteurs", _recherche_acheteurs_possible(), "clé Claude valide"),
        ("Prix SONAGESS", prix_agent is not None, "prix_agent.py"),
        ("Alertes météo avancées", weather is not None, "weather.py"),
        ("Transcription vocale", WhisperModel is not None, "pip install faster-whisper"),
    ]
    for nom, actif, source in etats:
        print(f"  {'✓' if actif else '✗'}  {nom:<26} {'' if actif else '→ manque : ' + source}")
    if not _recherche_acheteurs_possible():
        print("\n  ⚠️  L'assistant NE PEUT PAS chercher d'acheteurs.")
        print("      Il donnera des conseils généraux, sans inventer de contact.")
    print("=" * 60 + "\n")


@app.get("/voice/status")
def voice_status() -> Dict[str, object]:
    """État du système vocal — à ouvrir dans le navigateur pour diagnostiquer :
    http://localhost:8000/voice/status"""
    return {
        "whisper_installe": WhisperModel is not None,
        "modele_charge": _WHISPER is not None,
        "taille_modele": WHISPER_SIZE,
    }


def _process_voice(audio_bytes: bytes, filename: str,
                   region: Optional[str], cultures: Optional[str]) -> Dict[str, object]:
    """Cœur du traitement vocal : transcription puis réponse de l'assistant.
    Partagé par les deux endpoints (multipart et base64)."""
 
    print(f"[VOCAL] Reçu : {filename} ({len(audio_bytes)} octets)")
 
    if len(audio_bytes) < 1000:
        print("[VOCAL] ⚠️ Fichier quasi vide — l'enregistrement a échoué côté téléphone.")
        raise HTTPException(
            status_code=422,
            detail="L'enregistrement est vide. Vérifiez l'autorisation du micro.",
        )
 
    # ── 1. Transcription ──
    try:
        model = get_whisper()
    except RuntimeError as exc:
        print(f"[VOCAL] ❌ {exc}")
        raise HTTPException(status_code=503, detail=str(exc)) from exc
 
    suffix = Path(filename or "audio.m4a").suffix or ".m4a"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
 
    try:
        segments, info = model.transcribe(tmp_path, language="fr", vad_filter=True)
        transcription = " ".join(seg.text.strip() for seg in segments).strip()
        print(f"[VOCAL] Transcription ({info.duration:.1f}s audio) : « {transcription} »")
    except Exception as exc:
        print("[VOCAL] ❌ Échec de la transcription :")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Transcription impossible ({type(exc).__name__}): {exc}",
        ) from exc
    finally:
        os.unlink(tmp_path)
 
    if not transcription:
        print("[VOCAL] ⚠️ Audio décodé mais aucune parole détectée.")
        raise HTTPException(
            status_code=422,
            detail="Je n'ai pas entendu de parole. Parlez plus près du micro.",
        )
 
    # ── 2. LE MÊME assistant outillé que le chat écrit ──
    # « je veux vendre mon piment à Pô » dit à la VOIX déclenche donc aussi
    # la recherche d'acheteurs réels.
    try:
        text = repondre_assistant(
            transcription,
            region,
            cultures.replace(",", ", ") if cultures else None,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Assistant indisponible: {exc}") from exc

    return {"transcription": transcription, "response": strip_markdown(text)}
 
 
# ── Endpoint principal : audio en BASE64 dans du JSON (utilisé par l'app) ──
 
class VoiceB64Request(BaseModel):
    """Corps JSON envoyé par l'application mobile."""
    audio_b64: str
    filename: Optional[str] = "audio.m4a"
    region: Optional[str] = None
    cultures: Optional[str] = None  # "mais,mil,sorgho"
 
 
@app.post("/chat/voice-b64")
async def chat_voice_b64(request: VoiceB64Request = Body(...)) -> Dict[str, object]:
    """Message vocal (base64/JSON) → transcription → réponse de l'assistant."""
    try:
        audio_bytes = base64.b64decode(request.audio_b64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Audio base64 invalide: {exc}") from exc
 
    return _process_voice(audio_bytes, request.filename or "audio.m4a",
                          request.region, request.cultures)
 
 
# ── Endpoint multipart conservé (tests via /docs avec un fichier) ──
 
@app.post("/chat/voice")
async def chat_voice(
    audio: UploadFile = File(...),
    region: Optional[str] = Form(None),
    cultures: Optional[str] = Form(None),
) -> Dict[str, object]:
    """Message vocal (fichier multipart) → transcription → réponse."""
    audio_bytes = await audio.read()
    return _process_voice(audio_bytes, audio.filename or "audio.m4a", region, cultures)
 
# ═══════════════════════════════════════════════════════════════════════════
# PRIX DES MARCHÉS — GET /market/prices
# ═══════════════════════════════════════════════════════════════════════════
# Les prix vivent dans market_prices.json : pour les actualiser (chaque
# semaine, ou avant la démo), on édite ce fichier — AUCUN code à toucher.

@app.get("/market/prices")
def market_prices() -> Dict[str, object]:
    """Prix du jour + historique 30 jours, servis depuis market_prices.json."""
    if not MARKET_PRICES_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Fichier de prix introuvable: {MARKET_PRICES_FILE.name}",
        )
    try:
        with open(MARKET_PRICES_FILE, encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"market_prices.json invalide: {exc}") from exc


# ═══════════════════════════════════════════════════════════════════════════
# MÉTÉO — GET /weather  (relais Open-Meteo : gratuit, sans clé API)
# ═══════════════════════════════════════════════════════════════════════════

DEFAULT_LAT = 12.37   # Ouagadougou
DEFAULT_LON = -1.52

JOURS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

# Codes météo WMO → (libellé français simple, icône côté app mobile)
WEATHER_CODES: Dict[int, Tuple[str, str]] = {
    0:  ("Ciel dégagé", "sunny"),
    1:  ("Plutôt dégagé", "sunny"),
    2:  ("Partiellement nuageux", "partly-sunny"),
    3:  ("Couvert", "cloudy"),
    45: ("Brouillard", "cloudy"),
    48: ("Brouillard givrant", "cloudy"),
    51: ("Bruine légère", "rainy"),
    53: ("Bruine", "rainy"),
    55: ("Bruine forte", "rainy"),
    61: ("Pluie légère", "rainy"),
    63: ("Pluie", "rainy"),
    65: ("Pluie forte", "rainy"),
    80: ("Averses légères", "rainy"),
    81: ("Averses", "rainy"),
    82: ("Averses violentes", "rainy"),
    95: ("Orages", "thunderstorm"),
    96: ("Orages avec grêle", "thunderstorm"),
    99: ("Orages violents", "thunderstorm"),
}


def wmo_to_label(code: int) -> Tuple[str, str]:
    return WEATHER_CODES.get(code, ("Temps variable", "partly-sunny"))


@app.get("/weather")
def weather(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON) -> Dict[str, object]:
    """Météo actuelle + prévisions 3 jours pour la position donnée."""
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "timezone": "Africa/Ouagadougou",
                "forecast_days": 4,  # aujourd'hui + 3 jours
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Service météo indisponible: {exc}") from exc

    current = data.get("current", {})
    daily = data.get("daily", {})

    condition, icon = wmo_to_label(int(current.get("weather_code", 2)))

    # Prévisions : jours 1 à 3 (l'indice 0 est aujourd'hui)
    forecast = []
    dates = daily.get("time", [])
    for i in range(1, min(4, len(dates))):
        day_date = date.fromisoformat(dates[i])
        day_condition, day_icon = wmo_to_label(int(daily["weather_code"][i]))
        forecast.append({
            "day": JOURS_FR[day_date.weekday()],
            "tempMax": round(daily["temperature_2m_max"][i]),
            "tempMin": round(daily["temperature_2m_min"][i]),
            "condition": day_condition,
            "icon": day_icon,
            "rainChance": int(daily["precipitation_probability_max"][i] or 0),
        })

    return {
        "temperature": round(current.get("temperature_2m", 0)),
        "condition": condition,
        "icon": icon,
        "humidity": int(current.get("relative_humidity_2m", 0)),
        "windSpeed": round(current.get("wind_speed_10m", 0)),
        "rainChance": int((daily.get("precipitation_probability_max") or [0])[0] or 0),
        "forecast": forecast,
    }


# Lancement :
# c:/Users/HP/Desktop/TerraAI/venv311/Scripts/python.exe -m uvicorn app:app --host 0.0.0.0 --port 8000
