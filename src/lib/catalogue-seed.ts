/**
 * Shaw Traders EV — product list imported from the official
 * Shaw Traders Scooter Spare Parts Product Catalogue 2026-27 (PDF).
 *
 * Only names, part codes and the model section printed in the catalogue are
 * recorded here. No prices, stock or warranty data is invented — the shop
 * owner fills those in from the Admin panel.
 */

export type SeedProduct = {
  sku?: string;
  name: string;
  category: string;
  model?: string;
};

export const CATALOGUE_SEED: SeedProduct[] = [
  {
    "name": "Charger 4A Display",
    "category": "chargers"
  },
  {
    "name": "Charger 4A LED Waterproof",
    "category": "chargers"
  },
  {
    "name": "Charger 6A",
    "category": "chargers"
  },
  {
    "name": "Charger 10A",
    "category": "chargers"
  },
  {
    "name": "Charger 15A",
    "category": "chargers"
  },
  {
    "name": "Head Light Visor SLS1 Rizo",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Front Panel Plate SLS1 Rizo",
    "category": "body-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Front Panel SLS1 Rizo",
    "category": "body-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Mudguard SLS1 Single Light",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Floor Board Panel SLS1 Rizo",
    "category": "body-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Side Panel SLS1 Rizo Left",
    "category": "body-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Side Panel SLS1 Rizo Right",
    "category": "body-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Rear Plate SLS1 Rizo",
    "category": "body-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Under Floor SLS1 Rizo",
    "category": "body-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Swing ARM Cover SLS1 Single Light",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Meter Cover SLS1 Rizo",
    "category": "electrical-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Dust Cover SLS1 Rizo",
    "category": "body-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Rear Dust Cover SLS1 Single Light",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Inner Body SLS1 Rizo",
    "category": "body-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Inner Body Pocket SLS1 Rizo",
    "category": "body-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "VIN Cover SLS1 Single Light",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "BAG Hook Type 2 Spring",
    "category": "accessories",
    "sku": "1220-00-0002"
  },
  {
    "name": "Charging Socket Cover SLS1 Rizo",
    "category": "cables-wiring",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Floor Board SLS1 Rizo",
    "category": "body-parts",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Luggage BOX SLS1 Single Light",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Luggage BOX SLS1 Single Light Plate",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Rear Tyre Cover Type 1",
    "category": "body-parts",
    "sku": "1290-00-0001",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Rear Mudguard SLS1 Single Light",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Head Indicator SLS1 Rizo",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Front Light SLS1 Rizo",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Rear Light SLS1 Rizo",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Head Indicator SLS1 Rizo Light Glass",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Rear Light SLS1 Rizo Light Glass",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Rear Light SLS1 Rizo Light Glass I",
    "category": "lighting",
    "model": "SLS1 RIZO"
  },
  {
    "name": "Head Light Visor SLS3 Zingo",
    "category": "lighting"
  },
  {
    "name": "Side Panel SLS3 Zingo Left",
    "category": "body-parts"
  },
  {
    "name": "Meter Cover SLS3 Zingo",
    "category": "electrical-parts"
  },
  {
    "name": "VIN Cover SLS3 Zingo Single Light",
    "category": "lighting"
  },
  {
    "name": "Luggage BOX SLS3 Zingo Single Light Plate",
    "category": "lighting"
  },
  {
    "name": "Head Light SLS3 Zingo",
    "category": "lighting"
  },
  {
    "name": "Head Indicator SLS3 Zingo",
    "category": "lighting"
  },
  {
    "name": "Side Panel SLS3 Zingo Right",
    "category": "body-parts"
  },
  {
    "name": "Dust Cover SLS3 Zingo",
    "category": "body-parts"
  },
  {
    "name": "Front Light SLS3 Zingo",
    "category": "lighting"
  },
  {
    "name": "Rear Light SLS3 Zingo Light Glass",
    "category": "lighting"
  },
  {
    "name": "Rear Plate SLS3 Zingo",
    "category": "body-parts"
  },
  {
    "name": "Rear Dust Cover SLS3 Zingo Single Light",
    "category": "lighting"
  },
  {
    "name": "Charging Socket Cover SLS3 Zingo",
    "category": "cables-wiring"
  },
  {
    "name": "Rear Mudguard SLS3 Zingo Single Light",
    "category": "lighting"
  },
  {
    "name": "Rear Light SLS3 Zingo",
    "category": "lighting"
  },
  {
    "name": "Rear Light SLS3 Zingo Light Glass I",
    "category": "lighting"
  },
  {
    "name": "Mudguard SLS3 Zingo Single Light",
    "category": "lighting"
  },
  {
    "name": "Under Floor SLS3 Zingo",
    "category": "body-parts"
  },
  {
    "name": "Inner Body SLS3 Zingo",
    "category": "body-parts"
  },
  {
    "name": "Floor Board SLS3 Zingo",
    "category": "body-parts"
  },
  {
    "name": "Floor Board Panel SLS3 Zingo",
    "category": "body-parts"
  },
  {
    "name": "Swing ARM Cover SLS3 Zingo Single Light",
    "category": "lighting"
  },
  {
    "name": "Inner Body Pocket SLS3 Zingo",
    "category": "body-parts"
  },
  {
    "name": "Luggage BOX SLS3 Zingo Single Light",
    "category": "lighting"
  },
  {
    "name": "Head Light Visor SV1 Round Light Upper",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Head Light Visor SV1 Round Light Lower",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Head Light Visor Garnish SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Front Panel Plate SV1 Round",
    "category": "body-parts",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Front Panel Garnish SV1 Round Light Jali",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Front Panel Garnish SV1 Round Light Logo",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Front Panel SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Front Panel Garnish SV1 Round Light Centre",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Front Panel Garnish SV1 Round Light Side",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Lower Panel SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Mudguard SV1 Round Light Plate",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Mudguard SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Mudguard Garnish SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Floor Board Panel SV1 Round Light Garnish",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Side Panel SV1 Round Light Left",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Side Panel SV1 Round Light Right",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Rear Plate SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Swing ARM Cover SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Swing ARM Cover Garnish SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Inner Body SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "VIN Cover SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "BAG Hook Type 1 Common",
    "category": "accessories",
    "sku": "1220-00-0001"
  },
  {
    "name": "Tool Bucket SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Tool Bucket Door SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Rear Mudguard SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Floor Board SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Floor Board Ankle SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Luggage BOX SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Luggage BOX SV1 Round Light Plate",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Number Plate Light SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Head Light SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Front Indicator SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Rear Indicator SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Rear Light SV1 Round Light",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Head Light SV1 Round Light Glass",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Front Indicator SV1 Round Light Glass",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Rear Indicator SV1 Round Light Glass",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Rear Light SV1 Round Light Glass",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Rear Light SV1 Round Light Glass RED",
    "category": "lighting",
    "model": "SV1 ROUND LIGHT"
  },
  {
    "name": "Head Light Visor BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Head Light Visor Garnish BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Front Panel BV3 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Front Panel Garnish BV3",
    "category": "body-parts",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Mudguard BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Mudguard BV1 U Light Plate",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Floor Board Panel BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Under Floor BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "A Side Panel BV1 U Light Left",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Side Panel BV1 U Light Right",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Side Panel Garnish BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Rear Plate BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Swing ARM Cover BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Swing Cover Garnish BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Meter Cover BV1 U Light",
    "category": "electrical-parts",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Meter Cover BV1 U Light Garnish",
    "category": "electrical-parts",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Dust Cover BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Inner Body BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "VIN Cover BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Charging Socket Cover BV1 U Light",
    "category": "cables-wiring",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Tool Bucket BVI U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Tool Bucket Door BV1",
    "category": "body-parts",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Floor Board BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Luggage BOX BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Luggage BOX BV1 U Light Plate",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Rear Dust Cover BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Rear Mudguard BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Head Light BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Front Indicator BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Rear Indicator BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Rear Light BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Number Plate Light BV1 U Light",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Head Light BV1 U Light Glass",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Front Indicator BV1 U Light Glass",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Rear Indicator BV1 U Light Glass",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Rear Light BV1 U Light Glass",
    "category": "lighting",
    "model": "BV2 BIG GRILL"
  },
  {
    "name": "Front Indicator BV2",
    "category": "lighting",
    "model": "BV3 SMALL GRILL"
  },
  {
    "name": "Front Panel BV2",
    "category": "body-parts",
    "model": "BV3 SMALL GRILL"
  },
  {
    "name": "Tool Bucket BV1 U Light",
    "category": "lighting",
    "model": "BV3 SMALL GRILL"
  },
  {
    "name": "Front Panel Garnish BV2 (JIALI)",
    "category": "body-parts",
    "model": "BV3 SMALL GRILL"
  },
  {
    "name": "Front Floor Panel",
    "category": "body-parts",
    "model": "BV3 SMALL GRILL"
  },
  {
    "name": "Tool Bucket Door BV1 U Light",
    "category": "lighting",
    "model": "BV3 SMALL GRILL"
  },
  {
    "name": "Front Panel Garnish BV2",
    "category": "body-parts",
    "model": "BV3 SMALL GRILL"
  },
  {
    "name": "Side Panel BV1 U Light Left",
    "category": "lighting",
    "model": "BV3 SMALL GRILL"
  },
  {
    "name": "Swing ARM Cover Garnish BV1 U Light",
    "category": "lighting",
    "model": "BV3 SMALL GRILL"
  },
  {
    "name": "Head Light Visor SV2 Small Souare Vespo Upper",
    "category": "lighting"
  },
  {
    "name": "Head Light Visor SV2 Small Square Vespo Lower",
    "category": "lighting"
  },
  {
    "name": "Head Light Visor Garnish SV2 Small Square Vespo",
    "category": "lighting"
  },
  {
    "name": "Head Light Visor Garnish SV2 Small Square Vespo Rectangle",
    "category": "lighting"
  },
  {
    "name": "Front Panel Plate SV2 Small Square Vespo",
    "category": "body-parts"
  },
  {
    "name": "Front Panel Plate Garnish SV2 Small Square Vespo",
    "category": "body-parts"
  },
  {
    "name": "Front Panel SV2 Small Square Vespo",
    "category": "body-parts"
  },
  {
    "name": "Front Panel Garnish SV2 Small Square Vespo Centre",
    "category": "body-parts"
  },
  {
    "name": "Side Panel SV2 Small Square Vespo Left",
    "category": "body-parts"
  },
  {
    "name": "Side Panel SV2 Small Square Vespo Right",
    "category": "body-parts"
  },
  {
    "name": "Tool Bucket Door SVI Round",
    "category": "body-parts"
  },
  {
    "name": "Luggage BOX SV: Round Light",
    "category": "lighting"
  },
  {
    "name": "Rear Mudguard SVI Round",
    "category": "body-parts"
  },
  {
    "name": "Tool Bucket SVI Round Light",
    "category": "lighting"
  },
  {
    "name": "Front Indicator SV2 Small Light",
    "category": "lighting"
  },
  {
    "name": "Rear Light SV2 Small Square",
    "category": "lighting"
  },
  {
    "name": "Number Plate Light SV2 Small Souare Vespo",
    "category": "lighting"
  },
  {
    "name": "Head Light SV2 Small Square Vespo Glass",
    "category": "lighting"
  },
  {
    "name": "Front Indicator SV2 Small Square Vespo Glass",
    "category": "lighting"
  },
  {
    "name": "Rear Indicator SV2 Small Square Vespo Glass",
    "category": "lighting"
  },
  {
    "name": "Side Panel Garnish SV2 Small Square Vespo",
    "category": "body-parts"
  },
  {
    "name": "Rear Indicator SV2 Small Square Vespo",
    "category": "lighting"
  },
  {
    "name": "Rear Light SV2 Small Square Vespo Glass",
    "category": "lighting"
  },
  {
    "name": "Head Light Visor FH1",
    "category": "lighting",
    "sku": "1010-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Front Panel Garnish FH1",
    "category": "body-parts",
    "sku": "1060-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Side Panel FH1 Right",
    "category": "body-parts",
    "sku": "1120-02-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Inner Body Pocket FH1 Upper",
    "category": "body-parts",
    "sku": "1200-02-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Front Panel Plate Garnish FH1",
    "category": "body-parts",
    "sku": "1040-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Mudguard FH1",
    "category": "body-parts",
    "sku": "1080-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Rear Plate FH1",
    "category": "body-parts",
    "sku": "1140-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "VIN Cover FH1",
    "category": "body-parts",
    "sku": "1210-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Rear Mudguard FH1",
    "category": "body-parts",
    "sku": "1300-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Meter Cover FH1",
    "category": "electrical-parts",
    "sku": "1170-01-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Luggage BOX FH1",
    "category": "body-parts",
    "sku": "1270-01-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Floor Board Panel FH1 ABS",
    "category": "body-parts",
    "sku": "1100-01-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Under Floor FH1",
    "category": "body-parts",
    "sku": "1110-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Rear Panel Lower Plate FH1",
    "category": "body-parts",
    "sku": "1310-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Meter Cover FH1 Garnish",
    "category": "electrical-parts",
    "sku": "1170-02-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Front Panel FH1",
    "category": "body-parts",
    "sku": "1050-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Floor Board Panel FH1 PP",
    "category": "body-parts",
    "sku": "1100-02-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Dust Cover FH1",
    "category": "body-parts",
    "sku": "1180-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Floor Board FH1",
    "category": "body-parts",
    "sku": "1260-01-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Head Light FH1",
    "category": "lighting",
    "sku": "1500-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Swing ARM Cover FH1",
    "category": "body-parts",
    "sku": "1150-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Rear Tyre Cover FH1",
    "category": "body-parts",
    "sku": "1290-01-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Side Panel FH1 Left",
    "category": "body-parts",
    "sku": "1120-01-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Floor Board Panel FH1 Jointer",
    "category": "body-parts",
    "sku": "1100-03-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Inner Body FH1 Lower",
    "category": "body-parts",
    "sku": "1190-01-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Floor Board FH1 CAP",
    "category": "body-parts",
    "sku": "1260-02-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Front Indicator FH1",
    "category": "lighting",
    "sku": "1530-00-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Rear Tyre Cover FH1 Jointer",
    "category": "body-parts",
    "sku": "1290-02-9500",
    "model": "FH2 STAR"
  },
  {
    "name": "Head Light Visor BMV1",
    "category": "lighting",
    "model": "BMV1"
  },
  {
    "name": "Meter Cover BMV1",
    "category": "electrical-parts",
    "model": "BMV1"
  },
  {
    "name": "Head Light Visor Glass BMV1",
    "category": "lighting",
    "model": "BMV1"
  },
  {
    "name": "Meter Cover BMV1 Small Part",
    "category": "electrical-parts",
    "model": "BMV1"
  },
  {
    "name": "Front Panel BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Front Panel Garnish BMV1 Jali",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Front Panel Garnish BMV1 L+R",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Mudguard BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Mudguard BMV1 Plate",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Floor Board Panel BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Under Floor BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Side Panel BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Side Panel Garnish BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Rear Panel BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Rear Plate BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Swing ARM Cover BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Charging Socket Cover BMV1 ABS",
    "category": "cables-wiring",
    "model": "BMV1"
  },
  {
    "name": "Dust Cover BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Rear Dust Cover BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Inner Body BMV1 ABS",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Inner Body Pocket BMV1 ABS",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "VIN Cover BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Floor Board BMV1 ABS",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Floor Board BMV1 Jointer ABS",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "BAG Hook Chrome",
    "category": "accessories",
    "sku": "1220-00-0003"
  },
  {
    "name": "Rear Mudguard BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Luggage BOX BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Rear Tyre Cover BMV1",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Rear Light BMV1 Garnish",
    "category": "lighting",
    "model": "BMV1"
  },
  {
    "name": "Rear Mudguard Inner",
    "category": "body-parts",
    "model": "BMV1"
  },
  {
    "name": "Front Light BMV1",
    "category": "lighting",
    "model": "BMV1"
  },
  {
    "name": "Head Indicator BMV1",
    "category": "lighting",
    "model": "BMV1"
  },
  {
    "name": "Head Light BMV1",
    "category": "lighting",
    "model": "BMV1"
  },
  {
    "name": "Rear Indicator BMV1",
    "category": "lighting",
    "model": "BMV1"
  },
  {
    "name": "Number Plate Light BMV1",
    "category": "lighting",
    "model": "BMV1"
  },
  {
    "name": "Rear Light BMV1",
    "category": "lighting",
    "model": "BMV1"
  },
  {
    "name": "Head Light Visor BSL1",
    "category": "lighting",
    "sku": "1010-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Front Panel Garnish BSL1",
    "category": "body-parts",
    "sku": "1060-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Side Panel BSL1 Left",
    "category": "body-parts",
    "sku": "1120-01-9200",
    "model": "BSL2"
  },
  {
    "name": "Swing ARM Cover Garnish BSL1",
    "category": "body-parts",
    "sku": "1160-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Inner Body Pocket BSL1",
    "category": "body-parts",
    "sku": "1200-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Luggage BOX BSL1",
    "category": "body-parts",
    "sku": "1270-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Head Indicator BSL1",
    "category": "lighting",
    "sku": "1510-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Head Indicator BSL1 Glass",
    "category": "lighting",
    "sku": "1510-01-9200",
    "model": "BSL2"
  },
  {
    "name": "Front Panel Plate BSL1",
    "category": "body-parts",
    "sku": "1030-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Lower Panel BSL1",
    "category": "body-parts",
    "sku": "1070-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Side Panel BSL1 Right",
    "category": "body-parts",
    "sku": "1120-02-9200",
    "model": "BSL2"
  },
  {
    "name": "Meter Cover BSL1",
    "category": "electrical-parts",
    "sku": "1170-01-9200",
    "model": "BSL2"
  },
  {
    "name": "VIN Cover BSL1",
    "category": "body-parts",
    "sku": "1210-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Rear Tyre Cover BSL1",
    "category": "body-parts",
    "sku": "1290-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Front Light BSL1",
    "category": "lighting",
    "sku": "1520-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Rear Light BSL1 Glass",
    "category": "lighting",
    "sku": "1540-02-9200",
    "model": "BSL2"
  },
  {
    "name": "Front Panel Plate Garnish BSL1",
    "category": "body-parts",
    "sku": "1040-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Mudguard SL1 Single Light",
    "category": "lighting",
    "sku": "1080-00-9100",
    "model": "BSL2"
  },
  {
    "name": "Side Panel Garnish BSL1",
    "category": "body-parts",
    "sku": "1130-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Meter Cover RSL1 Garnish",
    "category": "electrical-parts",
    "sku": "1170-02-9200",
    "model": "BSL2"
  },
  {
    "name": "BAG Hook BIG",
    "category": "accessories",
    "sku": "1220-00-0005",
    "model": "BSL2"
  },
  {
    "name": "Rear Mudgard BSL1",
    "category": "accessories",
    "sku": "1300-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Rear Light BSL1",
    "category": "lighting",
    "sku": "1540-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Front Light BSL1 Glass",
    "category": "lighting",
    "sku": "1520-01-9200",
    "model": "BSL2"
  },
  {
    "name": "Front Panel BSL1 Left",
    "category": "body-parts",
    "sku": "1050-01-9200",
    "model": "BSL2"
  },
  {
    "name": "Floor Board Panel BSL1",
    "category": "body-parts",
    "sku": "1100-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Rear Plate BSL1",
    "category": "body-parts",
    "sku": "1140-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Dust Cover BSL1 Child",
    "category": "body-parts",
    "sku": "1180-02-9200",
    "model": "BSL2"
  },
  {
    "name": "Charging Socket Cover BSL1",
    "category": "cables-wiring",
    "sku": "1230-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Front Panel BSL1 Right",
    "category": "body-parts",
    "sku": "1050-02-9200",
    "model": "BSL2"
  },
  {
    "name": "Under Floor BSL1",
    "category": "body-parts",
    "sku": "1110-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Swing ARM Cover BSL1",
    "category": "body-parts",
    "sku": "1150-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Inner Body BSL1",
    "category": "body-parts",
    "sku": "1190-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Floor Board BSL1",
    "category": "body-parts",
    "sku": "1260-00-9200",
    "model": "BSL2"
  },
  {
    "name": "Head Light Visor OL1 Cola",
    "category": "lighting",
    "model": "COLA"
  },
  {
    "name": "Head Light Visor Glass OL1 Cola",
    "category": "lighting",
    "model": "COLA"
  },
  {
    "name": "Meter Cover OL1 Cola",
    "category": "electrical-parts",
    "model": "COLA"
  },
  {
    "name": "Meter Glass OL1 Cola",
    "category": "electrical-parts",
    "model": "COLA"
  },
  {
    "name": "Front Panel Plate OL1 Cola TOP",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Front Panel Plate OL1 Cola Bottom",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Front Panel OL1 Cola Left",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Front Panel OLI Cola Right",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Front Panel Garnish OL1 Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Mudguard OLI Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Floor Board Panel OL1 Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Side Panel OL1 Cola Left",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Side Panel OL1 Cola Right",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Rear Plate OL1 Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Under Floor OL1 Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Dust Cover OL1 Cola BIG",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Charging Socket Cover OL1 Cola TOP",
    "category": "cables-wiring",
    "model": "COLA"
  },
  {
    "name": "Swing ARM Cover OL1 Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Rear Tyre Cover OL1 Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Rear Dust Cover OL1 Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Inner Body OL1 Cola BIG",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Inner Body OL1 Cola Jointer",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Inner Body Pocket OL1 Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "VIN Cover OL1 Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Floor Board OL1 Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Rear Mudguard OL1 Cola",
    "category": "body-parts",
    "model": "COLA"
  },
  {
    "name": "Front Light OL1 Cola",
    "category": "lighting",
    "model": "COLA"
  },
  {
    "name": "Rear Light OL1 Cola",
    "category": "lighting",
    "model": "COLA"
  },
  {
    "name": "Scooter 3WHEEL Rear MUD",
    "category": "wheels-tyres"
  },
  {
    "name": "Scooter 3WHEEL Rear MUD Clamp",
    "category": "wheels-tyres"
  },
  {
    "name": "Scooter 3WHEEL Motor Cover",
    "category": "motors"
  },
  {
    "name": "Disc Brake Assembly Loader",
    "category": "brake-parts",
    "sku": "2650-00-0006",
    "model": "LEVER & PUMP"
  },
  {
    "name": "RIM 10 Inch Iron 3W",
    "category": "wheels-tyres"
  },
  {
    "name": "Differential 26\" Disc",
    "category": "brake-parts"
  },
  {
    "name": "Scooter 3WHEEL Swing ARM",
    "category": "wheels-tyres"
  },
  {
    "name": "Motor Pmsm 50SW",
    "category": "motors"
  },
  {
    "name": "Conver Sion KIT 3 Wheel",
    "category": "wheels-tyres"
  },
  {
    "name": "Wire Harness S1 Single Light",
    "category": "cables-wiring"
  },
  {
    "name": "Controller Wireless 48/60 /72 Techkast 35A",
    "category": "controllers"
  },
  {
    "name": "Handle T 27MM 15 Inch E2 Single Light",
    "category": "lighting"
  },
  {
    "name": "Handle T 30MM 15 Inch E2 Single Light",
    "category": "lighting"
  },
  {
    "name": "Handle T 31MM 16 Inch E5 & Magnus PRO FH",
    "category": "body-parts"
  },
  {
    "name": "Handle T 31MM 16 Inch Magnus C6",
    "category": "body-parts"
  },
  {
    "name": "Handle T 27MM 18 Inch E1 Round Light",
    "category": "lighting"
  },
  {
    "name": "Handle T 27MM E5 & Magnus PRO FH",
    "category": "body-parts"
  },
  {
    "name": "Handle T 27MM Optima",
    "category": "body-parts"
  },
  {
    "name": "Handle T 30MM I Praise",
    "category": "body-parts"
  },
  {
    "name": "Seat Catcher Small",
    "category": "body-parts"
  },
  {
    "name": "Seat Catcher BIG",
    "category": "body-parts"
  },
  {
    "name": "Seat Catcher Aluminium",
    "category": "body-parts"
  },
  {
    "name": "Seat Catcher BMV1",
    "category": "body-parts"
  },
  {
    "name": "Seat Carrier Plastic SL1 Single Light",
    "category": "lighting"
  },
  {
    "name": "Seat Carrier Iron SL1 Single Light",
    "category": "lighting"
  },
  {
    "name": "Seat Carrier Iron SL1 Single Light With W",
    "category": "lighting"
  },
  {
    "name": "Seat Carrier Aluminium SL1 Single Light",
    "category": "lighting"
  },
  {
    "name": "Seat Carrier Iron SV1 Round Light",
    "category": "lighting"
  },
  {
    "name": "Seat Carrier Aluminium CS Magnus",
    "category": "body-parts"
  },
  {
    "name": "Seat Carrier Aluminium FH1",
    "category": "body-parts"
  },
  {
    "name": "Bulb",
    "category": "accessories"
  },
  {
    "name": "Bulb HS 1 35/35W (FRONT LIGHT)",
    "category": "lighting"
  },
  {
    "name": "Bulb S2 35/35W (FRONT LIGHT)",
    "category": "lighting"
  },
  {
    "name": "Bulb T10 10W Amber (INDICATOR)",
    "category": "lighting"
  },
  {
    "name": "Bulb T10 5W (POSITION)",
    "category": "accessories"
  },
  {
    "name": "Bulb P 21/5W (REAR LIGHT)",
    "category": "lighting"
  },
  {
    "name": "LED Bulb",
    "category": "accessories"
  },
  {
    "name": "LED Bulb HS 1 35/35W",
    "category": "accessories"
  },
  {
    "name": "LED Bulb S2 3 Side",
    "category": "accessories"
  },
  {
    "name": "LED Bulb S2 1 Side",
    "category": "accessories"
  },
  {
    "name": "LED Bulb S2 Projector",
    "category": "accessories"
  },
  {
    "name": "Wires OF Lights",
    "category": "cables-wiring"
  },
  {
    "name": "Wire S2 3PIN (HEAD LIGHT)",
    "category": "cables-wiring"
  },
  {
    "name": "Wire S2 + T10 4PIN (HEAD Light + Position LIGHT)",
    "category": "cables-wiring"
  },
  {
    "name": "Wire T10 2PIN (INDICATOR)",
    "category": "cables-wiring"
  },
  {
    "name": "Wire P21/5 + T10 6PIN (REAR Light + INDICATOR)",
    "category": "cables-wiring"
  },
  {
    "name": "Seat",
    "category": "body-parts"
  },
  {
    "name": "Seat SL1 Single Light",
    "category": "lighting"
  },
  {
    "name": "Seat BV1 U Light",
    "category": "lighting"
  },
  {
    "name": "Seat SV1 Round Light",
    "category": "lighting"
  },
  {
    "name": "Seat CS Magnus",
    "category": "body-parts"
  },
  {
    "name": "Seat FH1",
    "category": "body-parts"
  },
  {
    "name": "Seat BSL1",
    "category": "body-parts"
  },
  {
    "name": "Seat Cover",
    "category": "body-parts"
  },
  {
    "name": "Seat Cover SL1 Single Light",
    "category": "lighting"
  },
  {
    "name": "Seat Cover SV1 Round Light",
    "category": "lighting"
  },
  {
    "name": "Seat Cover CS Magnus",
    "category": "body-parts"
  },
  {
    "name": "Seat Cover FH1",
    "category": "body-parts"
  },
  {
    "name": "Seat Cover BV1 U Light",
    "category": "lighting"
  },
  {
    "name": "Seat Cover BSL1",
    "category": "body-parts"
  },
  {
    "name": "Chassis",
    "category": "body-parts"
  },
  {
    "name": "Chassis SL1 Single Light",
    "category": "lighting"
  },
  {
    "name": "Chassis SV1 Round Light",
    "category": "lighting"
  },
  {
    "name": "Chassis BV1 U Light",
    "category": "lighting"
  },
  {
    "name": "Chassis CS Magnus",
    "category": "body-parts"
  },
  {
    "name": "Chassis FH1",
    "category": "body-parts"
  },
  {
    "name": "Chassis BSL1",
    "category": "body-parts"
  },
  {
    "name": "Chassis OLI Cola",
    "category": "body-parts"
  },
  {
    "name": "Chassis BMV1",
    "category": "body-parts"
  },
  {
    "name": "Handle BAR",
    "category": "body-parts"
  },
  {
    "name": "Handle BAR SL1 Single Light",
    "category": "lighting"
  },
  {
    "name": "Handle BAR SV1 Round Light",
    "category": "lighting"
  },
  {
    "name": "Handle BAR FH1",
    "category": "body-parts"
  },
  {
    "name": "Handle BAR CS Magnus",
    "category": "body-parts"
  },
  {
    "name": "Handle BAR BV1 U Light",
    "category": "lighting"
  },
  {
    "name": "Handle BAR BSL2 Smile",
    "category": "body-parts"
  },
  {
    "name": "Handle BAR BSL1",
    "category": "body-parts"
  },
  {
    "name": "Side Stand",
    "category": "accessories"
  },
  {
    "name": "Side Stand 10 Inch",
    "category": "accessories"
  },
  {
    "name": "Side Stand 12 Inch",
    "category": "accessories"
  },
  {
    "name": "Main Stand",
    "category": "accessories"
  },
  {
    "name": "Main Stand 10 Inch",
    "category": "accessories"
  },
  {
    "name": "Main Stand 12 Inch",
    "category": "accessories"
  },
  {
    "name": "Main Stand ON Swing ARM",
    "category": "body-parts"
  },
  {
    "name": "Swing ARM",
    "category": "body-parts"
  },
  {
    "name": "Swing ARM SL1 Single Light Drum",
    "category": "lighting"
  },
  {
    "name": "Swing ARM SL1 Single Light Disc",
    "category": "brake-parts"
  },
  {
    "name": "Swing ARM BV1 U Light Disc",
    "category": "brake-parts"
  },
  {
    "name": "Swing ARM FH1 Disc",
    "category": "brake-parts"
  },
  {
    "name": "Swing ARM SV1 Round Light Disc",
    "category": "brake-parts"
  },
  {
    "name": "Rear Shocker",
    "category": "suspension"
  },
  {
    "name": "Rear Shocker Light 310MM",
    "category": "suspension"
  },
  {
    "name": "Rear Shocker Heavy 310MM",
    "category": "suspension"
  },
  {
    "name": "Rear Shocker Heavy Double Spring 310",
    "category": "suspension"
  },
  {
    "name": "Front Shocker",
    "category": "suspension"
  },
  {
    "name": "Front Shocker 27MM Drum Round Light",
    "category": "suspension"
  },
  {
    "name": "Front Shocker 27MM Disc Round Light",
    "category": "brake-parts"
  },
  {
    "name": "Front Shocker 27MM Techkast Disc E2",
    "category": "brake-parts"
  },
  {
    "name": "Front Shocker 27MM Disc Single Light",
    "category": "brake-parts"
  },
  {
    "name": "Front Shocker 27MM Drum Single Light",
    "category": "suspension"
  },
  {
    "name": "Front Shocker 30MM Techkast Disc E2",
    "category": "brake-parts"
  },
  {
    "name": "Front Shocker 30MM Drum E2",
    "category": "suspension"
  },
  {
    "name": "Front Shocker 30MM Disc E2",
    "category": "brake-parts"
  },
  {
    "name": "Front Shocker 31 MM Disc E5 Type 1",
    "category": "brake-parts"
  },
  {
    "name": "Front Shocker 31 MM Drum E5 Type 1",
    "category": "suspension"
  },
  {
    "name": "Front Shocker 31 MM Disc Okinawa Type 2",
    "category": "brake-parts"
  },
  {
    "name": "Front Shocker 31 MM Drum Okinawa Type 2",
    "category": "suspension"
  },
  {
    "name": "Shocker Seal",
    "category": "suspension"
  },
  {
    "name": "Shocker OIL Seal 26*37*10.5",
    "category": "suspension"
  },
  {
    "name": "Shocker OIL Seal 30*40.5*10.5",
    "category": "suspension"
  },
  {
    "name": "Shocker OIL Seal 31*43*10.5",
    "category": "suspension"
  },
  {
    "name": "Shocker CAP 27MM",
    "category": "suspension"
  },
  {
    "name": "Shocker CAP 30MM",
    "category": "suspension"
  },
  {
    "name": "Shocker CAP 31MM",
    "category": "suspension"
  },
  {
    "name": "Shocker Boot Cover 27MM",
    "category": "suspension"
  },
  {
    "name": "Shocker Boot Cover 30MM",
    "category": "suspension"
  },
  {
    "name": "Shocker Boot Cover 31MM",
    "category": "suspension"
  },
  {
    "name": "Locks",
    "category": "locks-latches",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Ignition Lock 27MM Ignition Lock 27MM",
    "category": "locks-latches",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Ignition Lock 37MM Ignition Lock 37MM",
    "category": "locks-latches",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Ignition Lock 47MM Ignition Lock 47MM",
    "category": "locks-latches",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Ignition Lock 57MM Ignition Lock 57MM",
    "category": "locks-latches",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Ignition Lock BV1 U Light Ignition Lock BV1 U Light",
    "category": "locks-latches",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Ignition Lock Shutter Ignition Lock Shutter",
    "category": "locks-latches",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Ignition Lock Loader Ignition Lock Loader",
    "category": "locks-latches",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Brake Shoe",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Brake Shoe 110 Doose Brake Shoe 110 Doose",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Brake Shoe 110 Brake Shoe 110",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Brake Shoe 110 Rubber Brake Shoe 110 Rubber",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Brake Shoe 130 Brake Shoe 130",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Disc PAD",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Disc PAD Type 1 Common Disc PAD Type 1 Common",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Disc PAD Type 2 Small Vespa Disc PAD Type 2 Small Vespa",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Disc PAD Type 3 Jamopa Disc PAD Type 3 Jamopa",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Disc PAD Type 4 Tunwal Disc PAD Type 4 Tunwal",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Disc PAD Type 5 OLA Rear Disc PAD Type 5 OLA Rear",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Disc PAD Type 6 OLA Front Disc PAD Type 6 OLA Front",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Disc PAD Type 7 Okinawa Disc PAD Type 7 Okinawa",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Disc PAD Clip",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Disc PAD Clip Type 1 Common Disc PAD Clip Type 1 Common",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Disc PAD Clip Type 2 Small Vespa Disc PAD Clip Type 2 Small Vespa",
    "category": "brake-parts",
    "model": "LOCK & BRAKE PART"
  },
  {
    "name": "Nuts · Bolts · Washers",
    "category": "accessories"
  },
  {
    "name": "NUT 3MM",
    "category": "accessories"
  },
  {
    "name": "NUT 4MM",
    "category": "accessories"
  },
  {
    "name": "Flange NUT 5MM(8 NUMBER)",
    "category": "accessories"
  },
  {
    "name": "Flange NUT 6MM(10 NUMBER)",
    "category": "accessories"
  },
  {
    "name": "Flange NUT 8MM(12 NUMBER)",
    "category": "accessories"
  },
  {
    "name": "Flange NUT 10MM (14 NUMBER)",
    "category": "accessories"
  },
  {
    "name": "Lock NUT 12MM (17 NUMBER)",
    "category": "locks-latches"
  },
  {
    "name": "Flange Bolt",
    "category": "accessories"
  },
  {
    "name": "Flange Bolt 6*16 Chassis (10 NUMBER)",
    "category": "accessories"
  },
  {
    "name": "Flange Bolt 6*25 Chassis (10 NUMBER)",
    "category": "accessories"
  },
  {
    "name": "Flange Bolt 6*85 Seat Bolt (10 NUMBER)",
    "category": "accessories"
  },
  {
    "name": "Flange Bolt 8*15 Carrier (12 NUMBER)",
    "category": "accessories"
  },
  {
    "name": "LN Bolt 8*25 Handle T Bolt",
    "category": "accessories"
  },
  {
    "name": "Flange Bolt 8*35 Carrier (12 NUMBER)",
    "category": "accessories"
  },
  {
    "name": "Flange Bolt 10*30 Main Stand (14 NUMBER)",
    "category": "accessories"
  },
  {
    "name": "Flange Bolt 10*40 Rear Shocker (14 NUMBER)",
    "category": "suspension"
  },
  {
    "name": "Flange Bolt 10*50 Handle Bolt (14 NUMBER)",
    "category": "accessories"
  },
  {
    "name": "Body Screw",
    "category": "body-parts"
  },
  {
    "name": "Self Tapping 8*13 Body Screw",
    "category": "cables-wiring"
  },
  {
    "name": "Self Tapping 10*19 Lock Patti Screw",
    "category": "locks-latches"
  },
  {
    "name": "Disc Plate Bolt",
    "category": "brake-parts"
  },
  {
    "name": "LN OUT 8*22 Disc Plate",
    "category": "brake-parts"
  },
  {
    "name": "Phillips Screw",
    "category": "accessories"
  },
  {
    "name": "Thrust Phillips 3*25 MCB",
    "category": "accessories"
  },
  {
    "name": "Thrust Phillips 4*20 Charging Shocker",
    "category": "suspension"
  },
  {
    "name": "Thrust Phillips 5*10 Ignition Lock",
    "category": "locks-latches"
  },
  {
    "name": "Battery And Control LER Screw",
    "category": "ev-batteries"
  },
  {
    "name": "Thrust Phillips 5*8 With Washer (BATTERY SCREW)",
    "category": "ev-batteries"
  },
  {
    "name": "Excel Bolt",
    "category": "accessories"
  },
  {
    "name": "Exel Bolt 12*230 Excel Bolt",
    "category": "accessories"
  },
  {
    "name": "Exel Bolt 12*200 Excel Bolt Round Light",
    "category": "lighting"
  },
  {
    "name": "Side Stand Bolt",
    "category": "accessories"
  },
  {
    "name": "Side Stand Bolt With Sensor",
    "category": "accessories"
  },
  {
    "name": "Side Stand Bolt With OUT Sensor",
    "category": "accessories"
  },
  {
    "name": "Flasher & Buzzer",
    "category": "electrical-parts",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "Flasher 2 PIN USB",
    "category": "cables-wiring",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "Flasher 3 PIN USB",
    "category": "cables-wiring",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "Flasher 3PIN With Buzzer",
    "category": "cables-wiring",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "Alarm",
    "category": "body-parts",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "Alarm With Wire",
    "category": "cables-wiring",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "Alarm Wire Less",
    "category": "cables-wiring",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "Horn",
    "category": "electrical-parts",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "Horn 6MM",
    "category": "electrical-parts",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "DC To DC Converter",
    "category": "electrical-parts",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "DC To DC Waterproof 10A Black",
    "category": "electrical-parts",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "DC To DC Waterproof 10A 3 PIN",
    "category": "cables-wiring",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "DC To DC USB Waterproof 10A 3PIN",
    "category": "cables-wiring",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "DC To DC Waterproof 10A 4PIN",
    "category": "cables-wiring",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "DC To DC USB Waterproof 10 A 4PIN",
    "category": "cables-wiring",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "DC To DC USB 10A (NORMAL)",
    "category": "electrical-parts",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "DC To DC Part 4 PIN To 3 PIN",
    "category": "cables-wiring",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "DC To DC Part 3 PIN To 4 PIN",
    "category": "cables-wiring",
    "model": "HORN, FLASHER &CONVERTER"
  },
  {
    "name": "Battery Testing",
    "category": "ev-batteries"
  },
  {
    "name": "Battery Testing & Charge & Discharge",
    "category": "ev-batteries"
  },
  {
    "name": "Battery Testing FOR Lead Battery",
    "category": "ev-batteries"
  },
  {
    "name": "Sensor Testing",
    "category": "electrical-parts"
  },
  {
    "name": "Motor Testing FOR Sensor",
    "category": "motors"
  },
  {
    "name": "Charger Testing",
    "category": "accessories"
  },
  {
    "name": "Charger Testing Volt And AMP",
    "category": "accessories"
  },
  {
    "name": "Rear View Mirror",
    "category": "accessories"
  },
  {
    "name": "RVM Round Chrome",
    "category": "accessories"
  },
  {
    "name": "RVM Square Diamond",
    "category": "accessories"
  },
  {
    "name": "Tyre And Nozzle",
    "category": "wheels-tyres"
  },
  {
    "name": "Tyre 90-100-10",
    "category": "wheels-tyres"
  },
  {
    "name": "Tyre 90-90-12",
    "category": "wheels-tyres"
  },
  {
    "name": "Tyre Nozzle Type 2 PVR 50",
    "category": "wheels-tyres"
  },
  {
    "name": "Tyre Nozzle Type 3 PVR 70",
    "category": "wheels-tyres"
  },
  {
    "name": "Footrest",
    "category": "footrests"
  },
  {
    "name": "Footrest NYX Black",
    "category": "footrests"
  },
  {
    "name": "Footrest Alloy Button",
    "category": "footrests"
  },
  {
    "name": "Footrest H Black",
    "category": "footrests"
  },
  {
    "name": "Footrest CS Black",
    "category": "footrests"
  },
  {
    "name": "Footrest U Light Vespa Alloy",
    "category": "footrests"
  },
  {
    "name": "Footrest Ladies Black",
    "category": "footrests"
  },
  {
    "name": "Floor MAT",
    "category": "body-parts"
  },
  {
    "name": "Floor MAT SL1 Single Light",
    "category": "lighting"
  },
  {
    "name": "Floor MAT CS Magnus",
    "category": "body-parts"
  },
  {
    "name": "Floor MAT SV1 Round Light",
    "category": "lighting"
  },
  {
    "name": "Floor MAT BV1 U Light",
    "category": "lighting"
  },
  {
    "name": "Iron Guard",
    "category": "accessories"
  },
  {
    "name": "Steal Accessories Iron SL1 Single Light",
    "category": "lighting"
  },
  {
    "name": "Exel Bush",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Exel Bush 15MM",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Exel Bush 25MM",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Exel Bush 35MM",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bush Main Stand",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bush Handel",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bearing",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bearing 6201",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bearing 6202",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bearing 6203",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bearing 6204",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bearing 6205",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bearing 6206",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bearing 6302",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bearing 6006",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Bearing 30205",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "CON SET / Ball Racer",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Ball Racer 30MM Handel Bearing",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Ball Ring Small Ring",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Ball Ring BIG Ring",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Rubber Bush",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Swing ARM Bush",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Main Stand Rubber",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Spring",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Spring Side Stand",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Spring Main Stand",
    "category": "accessories",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Spring Brake Shoe 110MM",
    "category": "brake-parts",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Spring Brake CAM",
    "category": "brake-parts",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Spring Brake Shoe 160MM",
    "category": "brake-parts",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "Lock Clip",
    "category": "locks-latches",
    "model": "BEARING, BUSH & HARDWARE"
  },
  {
    "name": "HUB Motor 10 Inch",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor 10 Inch Drum 1000W",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor 10 Inch Drum 1200W",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor 10 Inch Disc 1000W",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor 12 Inch",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor 12 Inch Disc 1000W",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor 12 Inch Disc 1200W",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor 12 Inch Drum 1100MM 1000W",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor 12 Inch Drum 1100MM Optima 850W",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Cable 100OW",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Part Patti",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Part Washer 16MM",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Part Bush 16MM",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Part 16 MM NUT",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Parts",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Cover 10 Inch Drum",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Cover 10 Inch Disc",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Cover 10 Inch Back",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Cover 12 Inch Disc",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Cover 12 Inch Drum",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "HUB Motor Cover 12 Inch Back",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Motor Sensor",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Motor Sensor BIG",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Motor Sensor Green",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Motor Sensor RED",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Motor Sensor Capacitor",
    "category": "motors",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Control LER",
    "category": "accessories",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Controller With Wire 48/60 /72 3SA",
    "category": "controllers",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Controller Wireless 48/60 /72 Techkrist 3SA",
    "category": "controllers",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Controller Wireless 48/60 40A",
    "category": "controllers",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Controller Wireless 60/72 40A",
    "category": "controllers",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Controller CAN Base 4SA",
    "category": "controllers",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Controller Wireless 60/72 Praise",
    "category": "controllers",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Controller With Wire 48/60 Optima",
    "category": "controllers",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Wire OF Controller",
    "category": "controllers",
    "model": "HUB MOTOR & CONTROLLER"
  },
  {
    "name": "Chargin G Socket With Cable",
    "category": "cables-wiring",
    "model": "SOCKET AND WIRES"
  },
  {
    "name": "Chargin G Cable",
    "category": "cables-wiring",
    "model": "SOCKET AND WIRES"
  },
  {
    "name": "Chargin G Socket",
    "category": "cables-wiring",
    "model": "SOCKET AND WIRES"
  },
  {
    "name": "Wire Harness",
    "category": "cables-wiring",
    "model": "SOCKET AND WIRES"
  },
  {
    "name": "Battery Wire",
    "category": "ev-batteries",
    "model": "SOCKET AND WIRES"
  },
  {
    "name": "UBS Cable",
    "category": "cables-wiring",
    "model": "SOCKET AND WIRES"
  },
  {
    "name": "Disc Plate",
    "category": "brake-parts",
    "model": "BRAKE LEVER ASSEMBLY AND PARTS METAL PARTS"
  },
  {
    "name": "Brake Clip",
    "category": "brake-parts",
    "model": "BRAKE LEVER ASSEMBLY AND PARTS METAL PARTS"
  },
  {
    "name": "Caliper",
    "category": "accessories",
    "model": "BRAKE LEVER ASSEMBLY AND PARTS METAL PARTS"
  },
  {
    "name": "Caliper Plate",
    "category": "body-parts",
    "model": "BRAKE LEVER ASSEMBLY AND PARTS METAL PARTS"
  },
  {
    "name": "Caliper Bolt",
    "category": "accessories",
    "model": "BRAKE LEVER ASSEMBLY AND PARTS METAL PARTS"
  },
  {
    "name": "Brake & Seat Wire",
    "category": "brake-parts",
    "model": "BRAKE LEVER ASSEMBLY AND PARTS METAL PARTS"
  },
  {
    "name": "Throttle 123+FR",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle 123+R",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle 123+P",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle Double Push",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle Plain",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle ES",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle 123",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle Single Push",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle FR",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle With CAP 123+FR",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle With CAP 123+R",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle With CAP 123+P",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle With CAP Double Push",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle With CAP Plain",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle With CAP ES",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle With CAP 123",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle With CAP Single P",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle With CAP FR",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle Premium 123+FR",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle Premium 123+R",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle Premium 123+P",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle Switch Plain",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle Switch R+HAZARD",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle Switch Double PUSH,REPAIR+P",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle Switch HORN+123",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle Switch Single Push",
    "category": "electrical-parts"
  },
  {
    "name": "Throttle With Switch",
    "category": "electrical-parts"
  },
  {
    "name": "Brake Lever Assembly",
    "category": "brake-parts",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Lever Assembly Left",
    "category": "brake-parts",
    "sku": "2720-01-0001",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Lever Assembly Right",
    "category": "brake-parts",
    "sku": "2720-02-0001",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Pump",
    "category": "brake-parts",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Pump Left",
    "category": "brake-parts",
    "sku": "2730-01-0001",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Pump Right",
    "category": "brake-parts",
    "sku": "2730-02-0001",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Pump Mirror Left",
    "category": "brake-parts",
    "sku": "2730-01-0002",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Pump Mirror Right",
    "category": "brake-parts",
    "sku": "2730-02-0002",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Pump",
    "category": "brake-parts",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Pump Loader Right",
    "category": "brake-parts",
    "sku": "2730-02-0005",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Pump Loader Left",
    "category": "brake-parts",
    "sku": "2730-01-0004",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Pump Olak",
    "category": "brake-parts",
    "sku": "2730-00-1201",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Lever",
    "category": "brake-parts",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Lever Drum Left",
    "category": "brake-parts",
    "sku": "2740-00-0001",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Lever Drum Right",
    "category": "brake-parts",
    "sku": "2740-00-0002",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Lever Disc Left",
    "category": "brake-parts",
    "sku": "2740-00-0003",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Lever Disc Right",
    "category": "brake-parts",
    "sku": "2740-00-0004",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Brake Sensor",
    "category": "brake-parts",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Brake Sensor Drum Lever",
    "category": "brake-parts",
    "sku": "2790-00-0001",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Brake Sensor Left Disc Pump",
    "category": "brake-parts",
    "sku": "2790-00-0002",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Brake Sensor Right Disc Pump",
    "category": "brake-parts",
    "sku": "2790-00-0003",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Master Cylinder KIT",
    "category": "body-parts",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Master Cylinder KIT Small",
    "category": "body-parts",
    "sku": "2760-00-0001",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Master Cylinder KIT BIG",
    "category": "body-parts",
    "sku": "2760-00-0002",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Assembly",
    "category": "brake-parts",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Brake Assembly Front 40MM Round Light",
    "category": "brake-parts",
    "sku": "2650-00-0001",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Brake Assembly Front 48MM 10INCH SL",
    "category": "brake-parts",
    "sku": "2650-00-0002",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Disc Brake Assembly Front 58MM 12INCH SL",
    "category": "brake-parts",
    "sku": "2650-00-0003",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Drum Brake Assembly",
    "category": "brake-parts",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Drum Plate Assembly Front Round 110",
    "category": "body-parts",
    "sku": "2590-00-0001",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Drum Plate Assembly Rear Round 110",
    "category": "body-parts",
    "sku": "2590-00-0002",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Drum Plate Assembly Rear Single 110",
    "category": "body-parts",
    "sku": "2590-00-0005",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Drum Plate Assembly Front Round 130",
    "category": "body-parts",
    "sku": "2590-00-0003",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Drum Plate Assembly Rear Round 130",
    "category": "body-parts",
    "sku": "2590-00-0004",
    "model": "LEVER & PUMP"
  },
  {
    "name": "Meter V1 Round Light",
    "category": "electrical-parts",
    "sku": "1900-00-9000"
  },
  {
    "name": "Meter SL1 Single Light",
    "category": "electrical-parts",
    "sku": "1900-00-9100"
  },
  {
    "name": "Meter BSL1",
    "category": "electrical-parts",
    "sku": "1900-00-9200"
  },
  {
    "name": "Meter CS Magnus",
    "category": "electrical-parts",
    "sku": "1900-00-9410"
  },
  {
    "name": "Meter Ridge Oval Single Light OLD",
    "category": "electrical-parts",
    "sku": "1900-00-1110"
  },
  {
    "name": "Meter Ipraise",
    "category": "electrical-parts",
    "sku": "1900-00-1101"
  },
  {
    "name": "Meter EV1 U Light",
    "category": "electrical-parts",
    "sku": "1900-00-9300"
  },
  {
    "name": "Meter BSL2 Smile",
    "category": "electrical-parts",
    "sku": "1900-00-9210"
  },
  {
    "name": "Meter FH1",
    "category": "electrical-parts",
    "sku": "1900-00-9500"
  },
  {
    "name": "Meter Glass",
    "category": "electrical-parts"
  },
  {
    "name": "Meter Glass CS Magnus",
    "category": "electrical-parts",
    "sku": "1920-00-9410"
  },
  {
    "name": "Meter Glass V1 Round Light",
    "category": "electrical-parts",
    "sku": "1920-00-9000"
  },
  {
    "name": "Meter Glass EV1 U Light",
    "category": "electrical-parts",
    "sku": "1920-00-9300"
  },
  {
    "name": "Meter Glass FH1",
    "category": "electrical-parts",
    "sku": "1920-00-9500"
  },
  {
    "name": "Meter Glass SL1 Single Light",
    "category": "electrical-parts",
    "sku": "1920-00-9100"
  },
  {
    "name": "Meter Glass SV2 Small Souare Vespo",
    "category": "electrical-parts",
    "sku": "1920-00-9010"
  },
  {
    "name": "Meter PCB",
    "category": "electrical-parts"
  },
  {
    "name": "Meter PCB Type 1 LED",
    "category": "electrical-parts",
    "sku": "3020-00-0001"
  },
  {
    "name": "Meter PCB Type 2 TFT",
    "category": "electrical-parts",
    "sku": "3020-00-0002"
  },
  {
    "name": "Meter PCB Type 3 LED With Battery Vout",
    "category": "ev-batteries",
    "sku": "3020-00-0003"
  },
  {
    "name": "Mudguard Optima",
    "category": "body-parts",
    "sku": "1080-00-1003"
  },
  {
    "name": "Mudguard NYX",
    "category": "body-parts",
    "sku": "1080-01-1002"
  },
  {
    "name": "Number Plate Type 1",
    "category": "body-parts",
    "sku": "1480-00-0001"
  },
  {
    "name": "BAG Hook",
    "category": "accessories"
  },
  {
    "name": "Switch OLD Model (E2)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 1 OLD Light (E2)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 2 OLD Indicator (E2)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 3 OLD Dipper (E2)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 4 OLD Horn (E2)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 5 OLD Cruise (E2)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch NEW Model (E1)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 6 NEW Light (E1)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 7 NEW Indicator (E1)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 8 NEW Dipper (E1)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 9 NEW Horn (E1)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 10 NEW Cruise (E1)",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Special",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 11 NEW Light 4 PIN (E1)",
    "category": "cables-wiring"
  },
  {
    "name": "Switch Type 12 Hazard",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 13 Indicator + Hazard",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 14 HORN+P",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 15 1 2 3",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Type 16 U + R",
    "category": "electrical-parts"
  },
  {
    "name": "Switch Sets",
    "category": "electrical-parts"
  },
  {
    "name": "Switch SET SV2 Small Square Vespo Rise PRO",
    "category": "electrical-parts"
  },
  {
    "name": "Switch SET FH1 Magnus PRO",
    "category": "electrical-parts"
  },
  {
    "name": "Head Light Visor BSL2 Smile",
    "category": "lighting",
    "model": "BSL1 SMILE"
  },
  {
    "name": "Head Light Visor Garnish BSL2 Smile",
    "category": "lighting",
    "model": "BSL1 SMILE"
  },
  {
    "name": "Front Panel Center BSL2 Smile",
    "category": "body-parts",
    "model": "BSL1 SMILE"
  },
  {
    "name": "KIT With",
    "category": "body-parts",
    "model": "BSL1 SMILE"
  },
  {
    "name": "Light",
    "category": "lighting",
    "model": "BSL1 SMILE"
  },
  {
    "name": "Meter Cover BSL2 Smile",
    "category": "electrical-parts",
    "model": "BSL1 SMILE"
  },
  {
    "name": "Dust Cover BSL2 Smile",
    "category": "body-parts",
    "model": "BSL1 SMILE"
  },
  {
    "name": "Rear Mudguard BSL1",
    "category": "body-parts",
    "model": "BSL1 SMILE"
  },
  {
    "name": "Front Light BSL2 Smile",
    "category": "lighting",
    "model": "BSL1 SMILE"
  },
  {
    "name": "Head Indicator BSL2 Smile",
    "category": "lighting",
    "model": "BSL1 SMILE"
  },
  {
    "name": "Front Light BSL2 Smile Glass",
    "category": "lighting",
    "model": "BSL1 SMILE"
  },
  {
    "name": "Head Indicator BSL2 Smile Glass",
    "category": "lighting",
    "model": "BSL1 SMILE"
  },
  {
    "name": "Head Light Visor CS Magnus",
    "category": "lighting",
    "sku": "1010-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Head Light Visor Garnish CS Magnus",
    "category": "lighting",
    "sku": "1020-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Front Panel Plate CS2",
    "category": "body-parts",
    "sku": "1030-00-9420",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Front Panel Plate Garnish CS2",
    "category": "body-parts",
    "sku": "1040-00-9420",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Front Panel Garnish CS2",
    "category": "body-parts",
    "sku": "1060-00-9420",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Front Panel CS Magnus",
    "category": "body-parts",
    "sku": "1050-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Mudguard CS Magnus",
    "category": "body-parts",
    "sku": "1080-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Floor Board Panel CS Magnus ABS",
    "category": "body-parts",
    "sku": "1100-01-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Floor Board Panel CS Magnus PP",
    "category": "body-parts",
    "sku": "1100-02-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Side Panel CS Magnus Left",
    "category": "body-parts",
    "sku": "1120-01-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Side Panel CS Magnus Right",
    "category": "body-parts",
    "sku": "1120-02-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Side Panel Garnish CS Magnus",
    "category": "body-parts",
    "sku": "1130-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Rear Plate CS Magnus",
    "category": "body-parts",
    "sku": "1140-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Swing ARM Cover Garnish FH1",
    "category": "body-parts",
    "sku": "1160-00-9500",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Meter Cover CS Magnus",
    "category": "electrical-parts",
    "sku": "1170-01-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Meter Cover CS Magnus Garnish",
    "category": "electrical-parts",
    "sku": "1170-02-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Dust Cover CS Magnus",
    "category": "body-parts",
    "sku": "1180-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Inner Body CS Magnus",
    "category": "body-parts",
    "sku": "1190-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Inner Body Pocket CS Magnus",
    "category": "body-parts",
    "sku": "1200-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Inner Body CS Magnus Plate",
    "category": "body-parts",
    "sku": "1190-01-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "VIN Cover CS Magnus",
    "category": "body-parts",
    "sku": "1210-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Floor Board CS Magnus",
    "category": "body-parts",
    "sku": "1260-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Luggage BOX CS Magnus",
    "category": "body-parts",
    "sku": "1270-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Charging Socket Cover CS Magnus",
    "category": "cables-wiring",
    "sku": "1230-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Rear Mudguard CS Magnus",
    "category": "body-parts",
    "sku": "1300-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Head Light CS Magnus",
    "category": "lighting",
    "sku": "1500-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Front Indicator CS2",
    "category": "lighting",
    "sku": "1530-00-9420",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Rear Light CS Magnus",
    "category": "lighting",
    "sku": "1540-00-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Head Light CS Magnus Glass",
    "category": "lighting",
    "sku": "1500-01-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Rear Light CS Magnus Glass",
    "category": "lighting",
    "sku": "1540-02-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Front Indicator CS Magnus Glass",
    "category": "lighting",
    "sku": "1530-01-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Rear Light CS Magnus RED Glass",
    "category": "lighting",
    "sku": "1540-01-9410",
    "model": "CS2 MAGNUS"
  },
  {
    "name": "Front Panel Plate BMV2",
    "category": "body-parts",
    "model": "BMV2"
  },
  {
    "name": "Front Panel BMV2",
    "category": "body-parts",
    "model": "BMV2"
  },
  {
    "name": "Front Light BMV2",
    "category": "lighting",
    "model": "BMV2"
  },
  {
    "name": "Front Indicator BMV2",
    "category": "lighting",
    "model": "BMV2"
  },
  {
    "name": "Head Light Visor Garnish FH1",
    "category": "lighting"
  },
  {
    "name": "Front Panel Plate FH1",
    "category": "body-parts"
  },
  {
    "name": "Luggage BOX FH1 Plate",
    "category": "body-parts"
  },
  {
    "name": "Inner Body FH1 Upper",
    "category": "body-parts"
  },
  {
    "name": "Rear Light FH1",
    "category": "lighting"
  },
  {
    "name": "Number Plate Light BVI U Light",
    "category": "lighting"
  },
  {
    "name": "Head Light Visor CS Magnus ₹",
    "category": "lighting",
    "sku": "1010-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Head Light Visor Garnish CS Magnus ₹",
    "category": "lighting",
    "sku": "1020-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Front Panel Plate CS Magnus ₹",
    "category": "body-parts",
    "sku": "1030-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Front Panel Garnish CS Magnus ₹",
    "category": "body-parts",
    "sku": "1060-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Front Panel CS Magnus ₹",
    "category": "body-parts",
    "sku": "1050-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Mudguard CS Magnus ₹",
    "category": "body-parts",
    "sku": "1080-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Floor Board Panel CS Magnus ABS ₹",
    "category": "body-parts",
    "sku": "1100-01-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Floor Board Panel CS Magnus PP ₹",
    "category": "body-parts",
    "sku": "1100-02-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Side Panel CS Magnus Left ₹",
    "category": "body-parts",
    "sku": "1120-01-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Side Panel CS Magnus Right ₹",
    "category": "body-parts",
    "sku": "1120-02-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Side Panel Garnish CS Magnus ₹",
    "category": "body-parts",
    "sku": "1130-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Rear Plate CS Magnus ₹",
    "category": "body-parts",
    "sku": "1140-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Swing ARM Cover FH1 ₹",
    "category": "body-parts",
    "sku": "1150-00-9500",
    "model": "CS MAGNUS"
  },
  {
    "name": "Swing ARM Cover Garnish FH1 ₹",
    "category": "body-parts",
    "sku": "1160-00-9500",
    "model": "CS MAGNUS"
  },
  {
    "name": "Meter Cover CS Magnus ₹",
    "category": "electrical-parts",
    "sku": "1170-01-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Meter Cover CS Magnus Garnish ₹",
    "category": "electrical-parts",
    "sku": "1170-02-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Dust Cover CS Magnus ₹",
    "category": "body-parts",
    "sku": "1180-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Inner Body CS Magnus ₹",
    "category": "body-parts",
    "sku": "1190-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Inner Body Pocket CS Magnus ₹",
    "category": "body-parts",
    "sku": "1200-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Inner Body CS Magnus Plate ₹",
    "category": "body-parts",
    "sku": "1190-01-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "VIN Cover CS Magnus ₹",
    "category": "body-parts",
    "sku": "1210-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "BAG Hook Chrome ₹",
    "category": "accessories",
    "sku": "1220-00-0003",
    "model": "CS MAGNUS"
  },
  {
    "name": "Floor Board CS Magnus ₹",
    "category": "body-parts",
    "sku": "1260-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Luggage BOX CS Magnus ₹",
    "category": "body-parts",
    "sku": "1270-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Rear Tyre Cover Type 1 ₹",
    "category": "body-parts",
    "sku": "1290-00-0001",
    "model": "CS MAGNUS"
  },
  {
    "name": "Charging Socket Cover CS Magnus ₹",
    "category": "cables-wiring",
    "sku": "1230-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Rear Mudguard CS Magnus ₹",
    "category": "body-parts",
    "sku": "1300-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Head Light CS Magnus ₹",
    "category": "lighting",
    "sku": "1500-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Front Indicator CS Magnus ₹",
    "category": "lighting",
    "sku": "1530-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Rear Light CS Magnus ₹",
    "category": "lighting",
    "sku": "1540-00-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Head Light CS Magnus Glass ₹",
    "category": "lighting",
    "sku": "1500-01-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Rear Light CS Magnus Indicator Glass ₹",
    "category": "lighting",
    "sku": "1540-02-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Front Indicator CS Magnus Glass ₹",
    "category": "lighting",
    "sku": "1530-01-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Rear Light CS Magnus RED Glass ₹",
    "category": "lighting",
    "sku": "1540-01-9410",
    "model": "CS MAGNUS"
  },
  {
    "name": "Front Panel Plate SLS4 Rydero",
    "category": "body-parts",
    "model": "SLS4 RYDERO"
  },
  {
    "name": "Front Panel SLS4 Rydero",
    "category": "body-parts",
    "model": "SLS4 RYDERO"
  },
  {
    "name": "Side Panel Slsi Rizo Left",
    "category": "body-parts",
    "model": "SLS4 RYDERO"
  },
  {
    "name": "Rear Plate Slsi Rizo",
    "category": "body-parts",
    "model": "SLS4 RYDERO"
  },
  {
    "name": "Swing ARM Cover SL1 Single Light",
    "category": "lighting",
    "model": "SLS4 RYDERO"
  },
  {
    "name": "Rear Dust Cover SL1 Single Light",
    "category": "lighting",
    "model": "SLS4 RYDERO"
  },
  {
    "name": "Luggage BOX SL1 Single Light Plate",
    "category": "lighting",
    "model": "SLS4 RYDERO"
  },
  {
    "name": "Luggage BOX SL1 Single Light",
    "category": "lighting",
    "model": "SLS4 RYDERO"
  },
  {
    "name": "Front Light SLS4 Rydero",
    "category": "lighting",
    "model": "SLS4 RYDERO"
  },
  {
    "name": "Rear Mudguard SL1 Single Light",
    "category": "lighting",
    "model": "SLS4 RYDERO"
  },
  {
    "name": "Head Light Visor Slsi Rizo",
    "category": "lighting"
  },
  {
    "name": "Meter Cover Slsi Rizo",
    "category": "electrical-parts"
  },
  {
    "name": "VIN Cover SLI Single Light",
    "category": "lighting"
  },
  {
    "name": "Front Light SLS2 Sprinto",
    "category": "lighting"
  },
  {
    "name": "Front Panel Plate SLS2 Sprinto",
    "category": "body-parts"
  },
  {
    "name": "Side Panel Slsi Rizo Right",
    "category": "body-parts"
  },
  {
    "name": "Front Panel SLS2 Sprinto",
    "category": "body-parts"
  },
  {
    "name": "Under Floor Slsi Rizo",
    "category": "body-parts"
  },
  {
    "name": "Floor Board Slsi Rizo",
    "category": "body-parts"
  },
  {
    "name": "Head Light Visor DL1 Double Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Floor Board Panel SL1 Single Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "VIN Cover SL1 Single Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Head Indicator DL1 Double Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Head Indicator DL1 Double Light Glass",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Front Panel Plate DL1 Double Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Under Floor SL1 Single Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Meter Cover DL1 Double Light",
    "category": "electrical-parts",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Front Light DL1 Double Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Head Indicator DL1 Double Light Glass White",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Front Panel Plate Garnish DL1 Double Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Side Panel SL1 Single Light Left",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Dust Cover DL1 Double Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Charging Socket Cover SL1 Single Light",
    "category": "cables-wiring",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Rear Light SL1 Single Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Front Light DL1 Double Light Glass",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Front Panel DL1 Double Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Side Panel SL1 Single Light Right",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Inner Body DL1 Double Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Floor Board DL1 Double Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Rear Mudguard SL1 Sinble Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Rear Light SL1 Single Light Glass RED",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Rear Plate SL1 Single Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Inner Body Pocket DL1 Double Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Rear Paneox SL1 Single Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Rlaggaglahor SL1 Single Light",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Rear Light SL1 Single Light Giafs",
    "category": "lighting",
    "model": "DL1 DOUBLE LIGHT"
  },
  {
    "name": "Garnish Front Panel Plate Garnish SL1 Single Light Zalli",
    "category": "lighting"
  },
  {
    "name": "Garnish Front Panel Plate Garnish SL1 Single Light Light",
    "category": "lighting"
  },
  {
    "name": "Head Light Visor SL1 Single Light",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Head Light Visor Garnish SL1 Single Light",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Front Panel Plate SL2 Single Light NEW",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Front Panel Plate Garnish SL2 Single Light NEW",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Meter Cover SL1 Single Light",
    "category": "electrical-parts",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Meter Cover SL1 Single Light Garnish",
    "category": "electrical-parts",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Inner Body SL1 Single Light",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Inner Body Pocket SL1 Single Light",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Floor Board SL1 Single Light",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Rear Panel Lower Plate SL1 Single Light",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Head Indicator SL1 Single Light",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Front Light SL2 Single Light NEW",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Head Indicator SL1 Single Light Glass",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Rear Light SL1 Single Light Glass",
    "category": "lighting",
    "model": "SL2 SINGLE LIGHT NEW"
  },
  {
    "name": "Obinen Ay Cllite Powenco DY Tlist Toust OR Cuitomero Since Doft",
    "category": "accessories",
    "model": "OEM Quality"
  },
  {
    "name": "Quality Focused",
    "category": "accessories",
    "model": "OEM Quality"
  },
  {
    "name": "Reliable Supply",
    "category": "accessories",
    "model": "OEM Quality"
  },
  {
    "name": "Customer First",
    "category": "accessories",
    "model": "OEM Quality"
  },
  {
    "name": "Industry Experience",
    "category": "accessories",
    "model": "OEM Quality"
  },
  {
    "name": "Business Network",
    "category": "accessories",
    "model": "OEM Quality"
  },
  {
    "name": "Recognized For Professional Excellence IN Trading & Commercial Services",
    "category": "accessories",
    "model": "BENGAL EXCELLENCE AWARD 2026"
  },
  {
    "name": "Trust · Quality · Service • Growth",
    "category": "accessories",
    "model": "OUR COMMITMENT"
  },
  {
    "name": "Your Partner IN Electric Mobility",
    "category": "accessories",
    "model": "OUR COMMITMENT"
  },
  {
    "name": "©EV Spare Parts | Battery Chargers | © Electrical Components © Mechanical Parts | Distribution",
    "category": "chargers",
    "model": "OUR COMMITMENT"
  }
];
