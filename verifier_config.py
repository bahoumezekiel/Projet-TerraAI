"""
═══════════════════════════════════════════════════════════════════════════════
VERIFIER_CONFIG.PY — Pourquoi ma clé n'est-elle pas prise en compte ?
═══════════════════════════════════════════════════════════════════════════════

Lancez simplement :

    python verifier_config.py

Le script inspecte tout ce qui peut empêcher la lecture d'une clé API et
affiche exactement ce qui manque. Il ne touche à rien et n'appelle aucune API
(donc aucun coût).
═══════════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import os
from pathlib import Path

DOSSIER = Path(__file__).resolve().parent
FICHIER_ENV = DOSSIER / ".env"


def masquer(cle: str | None) -> str:
    """Affiche une clé sans la révéler : sk-proj...a1b2"""
    if not cle:
        return "(absente)"
    if len(cle) < 12:
        return "(trop courte — suspecte)"
    return f"{cle[:8]}...{cle[-4:]}  ({len(cle)} caractères)"


print("=" * 66)
print("  TERRAAI — VÉRIFICATION DE LA CONFIGURATION")
print("=" * 66)
print(f"\nDossier analysé : {DOSSIER}")

# ── 1. python-dotenv ──────────────────────────────────────────────────────
print("\n1) Lecture du fichier .env")
try:
    from dotenv import load_dotenv
    print("   ✓ python-dotenv est installé")
    if FICHIER_ENV.exists():
        load_dotenv(FICHIER_ENV, override=False)
        print(f"   ✓ .env trouvé : {FICHIER_ENV}")
    else:
        print(f"   ✗ AUCUN .env à cet emplacement : {FICHIER_ENV}")
        # Repérer les pièges Windows classiques
        for piege in (".env.txt", "env", ".ENV", ".env "):
            if (DOSSIER / piege).exists():
                print(f"     ⚠️  MAIS un fichier « {piege} » existe !")
                print(f"        Renommez-le exactement en « .env »")
        print("        (Windows masque les extensions : activez leur affichage")
        print("         dans l'Explorateur → Affichage → Extensions de noms de fichiers)")
except ImportError:
    print("   ✗ python-dotenv N'EST PAS INSTALLÉ → le .env est totalement ignoré")
    print("     Corriger : pip install python-dotenv")

# ── 2. Contenu brut du .env (sans révéler les clés) ───────────────────────
if FICHIER_ENV.exists():
    print("\n2) Contenu du .env (valeurs masquées)")
    try:
        for numero, ligne in enumerate(
            FICHIER_ENV.read_text(encoding="utf-8-sig").splitlines(), start=1
        ):
            nue = ligne.strip()
            if not nue or nue.startswith("#"):
                continue
            if "=" not in nue:
                print(f"   ⚠️  ligne {numero} sans « = » : {nue[:40]}")
                continue
            nom, valeur = nue.split("=", 1)
            nom, valeur = nom.strip(), valeur.strip()
            if valeur.startswith(("'", '"')) and valeur.endswith(("'", '"')):
                print(f"   ⚠️  {nom} : les GUILLEMETS ne sont pas nécessaires "
                      "dans un .env, retirez-les")
                valeur = valeur[1:-1]
            apercu = masquer(valeur) if "KEY" in nom.upper() else valeur
            print(f"   · {nom} = {apercu}")
    except Exception as exc:
        print(f"   ✗ Lecture impossible : {exc}")
else:
    print("\n2) Contenu du .env — non applicable")

# ── 3. Ce que Python voit réellement ──────────────────────────────────────
print("\n3) Variables réellement visibles par Python")
cle_api = os.getenv("ANTHROPIC_API_KEY")
modele = os.getenv("TERRAAI_MODELE")
print(f"   ANTHROPIC_API_KEY : {masquer(cle_api)}")
print(f"   TERRAAI_MODELE    : {modele or '(défaut : claude-sonnet-4-6)'}")

# ── 4. Paquets installés ──────────────────────────────────────────────────
print("\n4) Bibliothèques des fournisseurs")
for nom_module, commande in (("anthropic", "pip install anthropic"),):
    try:
        __import__(nom_module)
        print(f"   ✓ {nom_module}")
    except ImportError:
        print(f"   ✗ {nom_module} absent → {commande}")

# ── 5. Verdict ────────────────────────────────────────────────────────────
print("\n" + "=" * 66)
try:
    import anthropic as _a
    paquet_ok = True
except ImportError:
    paquet_ok = False

pret = paquet_ok and bool(os.getenv("ANTHROPIC_API_KEY"))
print(f"  VERDICT : Claude {'PRÊT ✓' if pret else 'NON CONFIGURÉ ✗'}")
if not pret:
    print("\n  Il faut les DEUX :")
    print(f"    {'✓' if paquet_ok else '✗'} pip install anthropic")
    print(f"    {'✓' if os.getenv('ANTHROPIC_API_KEY') else '✗'} ANTHROPIC_API_KEY visible")
    print("\n  .env attendu, à côté de app.py :")
    print("    ANTHROPIC_API_KEY=sk-ant-xxxxxxxx")
print("=" * 66 + "\n")
