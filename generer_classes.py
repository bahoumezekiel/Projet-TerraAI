"""
═══════════════════════════════════════════════════════════════════════════════
GENERER_CLASSES.PY — Fige les noms de classes des modèles
═══════════════════════════════════════════════════════════════════════════════

POURQUOI CE SCRIPT
------------------
Les modèles .h5 ne contiennent PAS les noms de leurs classes : ils renvoient
un numéro (« la sortie n° 10 »). Les noms viennent des dossiers du dataset
d'entraînement. Sans eux, l'API renvoie « class_10 » et l'application affiche
« Espèce non référencée » à chaque analyse.

Ce script crée classes_disease.json et classes_pest.json, qui doivent ensuite
VOYAGER AVEC les fichiers .h5 sur toute machine où tourne l'API.

UTILISATION
-----------
    python generer_classes.py

  • Si le dataset est présent : les fichiers sont créés automatiquement.
  • Sinon : le script affiche le nombre exact de classes attendu par chaque
    modèle et la marche à suivre pour les saisir à la main.

SAISIE MANUELLE (si le dataset n'est pas sur cette machine)
-----------------------------------------------------------
Demandez à la personne qui a entraîné le modèle la liste ORDONNÉE des
classes (l'ordre alphabétique des dossiers du dataset, celui qu'a vu
l'entraînement), puis créez le fichier à la main, par exemple :

    classes_pest.json
    [
      "Aphids",
      "Armyworm",
      "Beetle",
      ...
    ]

⚠️ L'ORDRE est capital : c'est lui qui relie le numéro de sortie au nom.
   Une liste dans le mauvais ordre donne des diagnostics faux — pire que
   pas de noms du tout.
═══════════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

DATASETS = {
    "disease": ROOT / "plantes_deseases" / "New Plant Diseases Dataset(Augmented)"
                    / "New Plant Diseases Dataset(Augmented)" / "train",
    "pest": ROOT / "plantes_pest" / "train",
}

MODELES = {
    "disease": ROOT / "plante_deseases.h5",
    "pest": ROOT / "plante_pest_v2.h5",
}


def nombre_de_sorties(model_type: str) -> int | None:
    """Nombre de classes attendu par le modèle (sa dernière couche)."""
    chemin = MODELES[model_type]
    if not chemin.exists():
        print(f"  ✗ Modèle introuvable : {chemin.name}")
        return None
    try:
        from tensorflow.keras.models import load_model  # import tardif : c'est lent
        modele = load_model(chemin)
        return int(modele.output_shape[-1])
    except Exception as exc:
        print(f"  ✗ Lecture du modèle impossible : {exc}")
        return None


def classes_depuis_dataset(model_type: str) -> list[str]:
    """Noms des classes = noms des dossiers du dataset, triés (ordre d'entraînement)."""
    dossier = DATASETS[model_type]
    if not dossier.exists():
        return []
    return [
        enfant.name
        for enfant in sorted(dossier.iterdir(), key=lambda p: p.name)
        if enfant.is_dir()
    ]


def traiter(model_type: str) -> None:
    print(f"\n─── Modèle « {model_type} » ─────────────────────────────────")

    cible = ROOT / f"classes_{model_type}.json"
    if cible.exists():
        with open(cible, encoding="utf-8") as f:
            existant = json.load(f)
        print(f"  ✓ {cible.name} existe déjà ({len(existant)} classes).")
        print(f"    Premières : {', '.join(existant[:3])}...")
        return

    classes = classes_depuis_dataset(model_type)
    attendu = nombre_de_sorties(model_type)

    if classes:
        if attendu is not None and len(classes) != attendu:
            print(f"  ⚠️  {len(classes)} dossiers trouvés mais le modèle attend "
                  f"{attendu} classes — NE PAS utiliser tel quel.")
            print("     Le dataset ne correspond pas à ce modèle.")
            return
        with open(cible, "w", encoding="utf-8") as f:
            json.dump(classes, f, ensure_ascii=False, indent=2)
        print(f"  ✓ {cible.name} créé : {len(classes)} classes.")
        print(f"    Premières : {', '.join(classes[:3])}...")
        return

    # Pas de dataset : on guide la saisie manuelle
    print(f"  ✗ Dataset absent ({DATASETS[model_type]}).")
    if attendu:
        print(f"  → Le modèle attend exactement {attendu} classes.")
        print(f"  → Demandez la liste ORDONNÉE des {attendu} classes, puis créez")
        print(f"    {cible.name} : un tableau JSON de {attendu} chaînes.")
        gabarit = ROOT / f"classes_{model_type}.GABARIT.json"
        with open(gabarit, "w", encoding="utf-8") as f:
            json.dump([f"REMPLACER_classe_{i}" for i in range(attendu)],
                      f, ensure_ascii=False, indent=2)
        print(f"  → Gabarit prêt à remplir : {gabarit.name}")
        print(f"    (remplissez-le, puis renommez-le en {cible.name})")


if __name__ == "__main__":
    print("=" * 62)
    print("  TERRAAI — Figement des noms de classes")
    print("=" * 62)
    for t in ("disease", "pest"):
        traiter(t)
    print("\nTerminé. Relancez l'API : les avertissements [CLASSES] doivent disparaître.\n")
