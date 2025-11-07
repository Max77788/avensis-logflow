-- Insert all carriers from the application
INSERT INTO carriers (name) VALUES
  ('2SM'),
  ('4HR TRUCKING'),
  ('4K'),
  ('AFS'),
  ('ARAIES'),
  ('AVENSIS'),
  ('BALL FARMS'),
  ('BOWEN SERVICES'),
  ('BROSS'),
  ('CL TRUCKING'),
  ('CULPEPPER'),
  ('DRY RIVER LOGISTICS'),
  ('FOX TRANSPORTATION'),
  ('HASKELL'),
  ('ISM'),
  ('JOAT ONE ENTERPRISES'),
  ('K KAY''S TRUCKING'),
  ('MAAVS'),
  ('NEWRISE ENTERPRISES'),
  ('RMC'),
  ('SCHLUCHT'),
  ('SMASH INDUSTRIES'),
  ('T&F SAND'),
  ('TRU AVANT')
ON CONFLICT (name) DO NOTHING;

-- Insert trucks for 2SM
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '04 2SM', id FROM carriers WHERE name = '2SM'
  UNION ALL SELECT '01 2SM', id FROM carriers WHERE name = '2SM'
  UNION ALL SELECT '02 2SM', id FROM carriers WHERE name = '2SM'
  UNION ALL SELECT '4 2SM', id FROM carriers WHERE name = '2SM'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for 4HR TRUCKING
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '3 DOSSER', id FROM carriers WHERE name = '4HR TRUCKING'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for 4K
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '004', id FROM carriers WHERE name = '4K'
  UNION ALL SELECT '04 4K', id FROM carriers WHERE name = '4K'
  UNION ALL SELECT '4', id FROM carriers WHERE name = '4K'
  UNION ALL SELECT '03 4K', id FROM carriers WHERE name = '4K'
  UNION ALL SELECT '04 3K', id FROM carriers WHERE name = '4K'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for ARAIES
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '1229', id FROM carriers WHERE name = 'ARAIES'
  UNION ALL SELECT '47 ARAES', id FROM carriers WHERE name = 'ARAIES'
  UNION ALL SELECT '47', id FROM carriers WHERE name = 'ARAIES'
  UNION ALL SELECT '0605 ARAES', id FROM carriers WHERE name = 'ARAIES'
  UNION ALL SELECT '01 NRE', id FROM carriers WHERE name = 'ARAIES'
  UNION ALL SELECT '605 ARAES', id FROM carriers WHERE name = 'ARAIES'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for AVENSIS
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '3379', id FROM carriers WHERE name = 'AVENSIS'
  UNION ALL SELECT '2780', id FROM carriers WHERE name = 'AVENSIS'
  UNION ALL SELECT '1324', id FROM carriers WHERE name = 'AVENSIS'
  UNION ALL SELECT '2756', id FROM carriers WHERE name = 'AVENSIS'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for BALL FARMS
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '54', id FROM carriers WHERE name = 'BALL FARMS'
  UNION ALL SELECT '43', id FROM carriers WHERE name = 'BALL FARMS'
  UNION ALL SELECT '47 BALL', id FROM carriers WHERE name = 'BALL FARMS'
  UNION ALL SELECT '52 BALL', id FROM carriers WHERE name = 'BALL FARMS'
  UNION ALL SELECT '54 BALL', id FROM carriers WHERE name = 'BALL FARMS'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for BOWEN SERVICES
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '359', id FROM carriers WHERE name = 'BOWEN SERVICES'
  UNION ALL SELECT '6', id FROM carriers WHERE name = 'BOWEN SERVICES'
  UNION ALL SELECT '06 BOWEN', id FROM carriers WHERE name = 'BOWEN SERVICES'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for BROSS
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '205 BROSS', id FROM carriers WHERE name = 'BROSS'
  UNION ALL SELECT '205', id FROM carriers WHERE name = 'BROSS'
  UNION ALL SELECT '221 BROSS', id FROM carriers WHERE name = 'BROSS'
  UNION ALL SELECT 'B213', id FROM carriers WHERE name = 'BROSS'
  UNION ALL SELECT '221', id FROM carriers WHERE name = 'BROSS'
  UNION ALL SELECT 'B 213', id FROM carriers WHERE name = 'BROSS'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for CL TRUCKING
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '5 CL', id FROM carriers WHERE name = 'CL TRUCKING'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for CULPEPPER
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '11 LBK', id FROM carriers WHERE name = 'CULPEPPER'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for FOX TRANSPORTATION
INSERT INTO trucks (truck_id, carrier_id)
  SELECT 'S349', id FROM carriers WHERE name = 'FOX TRANSPORTATION'
  UNION ALL SELECT 'S 349', id FROM carriers WHERE name = 'FOX TRANSPORTATION'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for ISM
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '004', id FROM carriers WHERE name = 'ISM'
  UNION ALL SELECT '006 ISM', id FROM carriers WHERE name = 'ISM'
  UNION ALL SELECT '8349', id FROM carriers WHERE name = 'ISM'
  UNION ALL SELECT '4', id FROM carriers WHERE name = 'ISM'
  UNION ALL SELECT '6', id FROM carriers WHERE name = 'ISM'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for JOAT ONE ENTERPRISES
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '111 JOAT', id FROM carriers WHERE name = 'JOAT ONE ENTERPRISES'
  UNION ALL SELECT '111', id FROM carriers WHERE name = 'JOAT ONE ENTERPRISES'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for K KAY'S TRUCKING
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '110 KK', id FROM carriers WHERE name = 'K KAY''S TRUCKING'
  UNION ALL SELECT '112 KK', id FROM carriers WHERE name = 'K KAY''S TRUCKING'
  UNION ALL SELECT '102 KK', id FROM carriers WHERE name = 'K KAY''S TRUCKING'
  UNION ALL SELECT '100 KK', id FROM carriers WHERE name = 'K KAY''S TRUCKING'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for MAAVS
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '1138 MAAVS', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '1119 MAAVS', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '3076 MAAVS', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '1135 MAAVS', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '57 MAAVS', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '220 MAAVS', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '1135', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '3076', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '1136 MAAVS', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '1122 MAAVS', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT 'A2 MAAVS', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '820', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '12 R', id FROM carriers WHERE name = 'MAAVS'
  UNION ALL SELECT '12R', id FROM carriers WHERE name = 'MAAVS'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for NEWRISE ENTERPRISES
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '02 NR', id FROM carriers WHERE name = 'NEWRISE ENTERPRISES'
  UNION ALL SELECT '02 NRE', id FROM carriers WHERE name = 'NEWRISE ENTERPRISES'
  UNION ALL SELECT '01 NRE', id FROM carriers WHERE name = 'NEWRISE ENTERPRISES'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for RMC
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '11', id FROM carriers WHERE name = 'RMC'
  UNION ALL SELECT 'RMC 11', id FROM carriers WHERE name = 'RMC'
  UNION ALL SELECT '11 TRIPPEL', id FROM carriers WHERE name = 'RMC'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for SCHLUCHT
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '1258', id FROM carriers WHERE name = 'SCHLUCHT'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for SMASH INDUSTRIES
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '1002 SMASH', id FROM carriers WHERE name = 'SMASH INDUSTRIES'
  UNION ALL SELECT '217 SMASH', id FROM carriers WHERE name = 'SMASH INDUSTRIES'
  UNION ALL SELECT '2003', id FROM carriers WHERE name = 'SMASH INDUSTRIES'
  UNION ALL SELECT '1002', id FROM carriers WHERE name = 'SMASH INDUSTRIES'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for T&F SAND
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '34 T&F', id FROM carriers WHERE name = 'T&F SAND'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for TRU AVANT
INSERT INTO trucks (truck_id, carrier_id)
  SELECT '02 TNA', id FROM carriers WHERE name = 'TRU AVANT'
  UNION ALL SELECT '3 TNA', id FROM carriers WHERE name = 'TRU AVANT'
  UNION ALL SELECT '4 TNA', id FROM carriers WHERE name = 'TRU AVANT'
  UNION ALL SELECT '5 TNA', id FROM carriers WHERE name = 'TRU AVANT'
  UNION ALL SELECT '6 TNA', id FROM carriers WHERE name = 'TRU AVANT'
  UNION ALL SELECT '7 TNA', id FROM carriers WHERE name = 'TRU AVANT'
  UNION ALL SELECT '8 TNA', id FROM carriers WHERE name = 'TRU AVANT'
  UNION ALL SELECT '9 TNA', id FROM carriers WHERE name = 'TRU AVANT'
  UNION ALL SELECT '10 TNA', id FROM carriers WHERE name = 'TRU AVANT'
  UNION ALL SELECT '02 DA3', id FROM carriers WHERE name = 'TRU AVANT'
  UNION ALL SELECT '03 DA3', id FROM carriers WHERE name = 'TRU AVANT'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

