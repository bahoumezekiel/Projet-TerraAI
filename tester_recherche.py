"""
═══════════════════════════════════════════════════════════════════════════════
TESTER_RECHERCHE.PY — La recherche d'acheteurs fonctionne-t-elle ?
═══════════════════════════════════════════════════════════════════════════════

À lancer AVANT la démonstration : ce script teste la chaîne de recherche web
sans passer par l'application ni par le serveur. Si elle échoue ici, elle
échouera dans l'app — mais l'erreur sera lisible.

    python tester_recherche.py                    (test minimal, très peu coûteux)
    python tester_recherche.py mil "Kaya"         (vraie recherche d'acheteurs)

⚠️ Ce script CONSOMME un appel à l'API (c'est le but : vérifier en réel).
   Le test minimal coûte quelques centimes ; la vraie recherche davantage.
═══════════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import sys

import llm

print("=" * 66)
print("  TERRAAI — TEST DE LA RECHERCHE WEB")
print("=" * 66)

etat = llm.etat()
print(f"\nIntelligence : {'Claude' if etat.get('fournisseur') else 'INDISPONIBLE'}")
print(f"Modèle      : {etat.get('modele')}")

if not etat.get("fournisseur"):
    print("\n✗ Aucun fournisseur configuré. Lancez d'abord : python verifier_config.py")
    sys.exit(1)

# ── Mode 1 : test minimal ────────────────────────────────────────────────
if len(sys.argv) < 3:
    print("\n1) Test minimal de la recherche web...")
    resultat = llm.tester_recherche_web()

    if resultat["ok"]:
        print(f"   ✓ RECHERCHE WEB OPÉRATIONNELLE")
        print(f"     Sources consultées : {resultat['sources']}")
        print(f"     Extrait : {resultat['extrait']}")
        print("\n   → La recherche d'acheteurs fonctionnera dans l'application.")
        print("   → Pour un test complet : python tester_recherche.py mil \"Kaya\"")
    else:
        print("   ✗ RECHERCHE WEB INDISPONIBLE")
        print(f"     {resultat['erreur'][:400]}")
        print("\n   Pistes :")
        print("     · pip install -U anthropic")
        print("     · vérifier le solde sur console.anthropic.com (Plans & Billing)")
        print("     · essayer un autre modèle : setx TERRAAI_MODELE \"claude-sonnet-4-6\"")
        print("\n   Sans recherche web, l'assistant reste utilisable : il dira")
        print("   honnêtement qu'il n'a pas de contacts et donnera des pistes")
        print("   générales. Aucun contact ne sera inventé.")
    print("=" * 66 + "\n")
    sys.exit(0 if resultat["ok"] else 1)

# ── Mode 2 : vraie recherche d'acheteurs ─────────────────────────────────
produit = sys.argv[1]
lieu = " ".join(sys.argv[2:])

print(f"\n2) Recherche réelle : « {produit} » près de « {lieu} »")
print("   (30 à 60 secondes, plusieurs recherches web en cours...)\n")

instructions = (
    "Tu es l'assistant commercial de TerraAI, au service des agriculteurs du "
    "Burkina Faso. Trouve des ACHETEURS potentiels pour la récolte, aussi près "
    "que possible de la localisation indiquée : restaurants, maquis, hôtels, "
    "épiceries, grossistes de vivres, marchés, unités de transformation, "
    "coopératives. Pour chacun : NOM, TYPE, LOCALITÉ, ADRESSE et TÉLÉPHONE si "
    "disponibles en ligne. N'INVENTE JAMAIS un numéro ni une adresse. Si rien "
    "n'existe en ligne pour une zone rurale, dis-le et propose des pistes "
    "concrètes. Réponds en français."
)
question = (
    f"Je suis agriculteur au Burkina Faso et je veux vendre ma récolte de "
    f"{produit}. Ma localisation : {lieu}. Trouve-moi des acheteurs potentiels "
    "avec leurs coordonnées."
)

try:
    r = llm.recherche_web(instructions, question, max_tokens=2000)
except Exception as exc:
    print(f"✗ ÉCHEC : {exc}")
    sys.exit(1)

print("─" * 66)
print(r["answer"])
print("─" * 66)
sources = r.get("sources") or []
print(f"\n{len(sources)} source(s) consultée(s) :")
for s in sources[:10]:
    print(f"  · {s.get('title', '')[:60]} — {s.get('url', '')[:70]}")

print("\n✓ Test terminé.")
print("  Si des acheteurs réels apparaissent ci-dessus avec leurs sources,")
print("  la fonctionnalité est prête pour la démonstration.")
print("=" * 66 + "\n")
