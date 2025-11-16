-- ============================================================================
-- POPULATE CARRIERS AND TRUCKS FROM TRUCKSANDCARRIERS.TS DATA
-- ============================================================================

-- Insert all carriers
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
SELECT v, (SELECT id FROM carriers WHERE name = '2SM')
FROM (VALUES ('04 2SM'), ('01 2SM'), ('02 2SM'), ('4 2SM')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for 4HR TRUCKING
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = '4HR TRUCKING')
FROM (VALUES ('3 DOSSER')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for 4K
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = '4K')
FROM (VALUES ('004'), ('04 4K'), ('4'), ('03 4K'), ('04 3K')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for AFS (23 trucks)
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'AFS')
FROM (VALUES 
  ('0'), ('002 3AE'), ('003 3AC'), ('004 3AE'), ('005 3AE'), ('006 3AE'),
  ('001 3AE'), ('003 3AE'), ('007 3AE'), ('008 3AE'), ('009 3AE'), ('010 3AE'),
  ('51 DRL'), ('001 RAE'), ('011 3AE'), ('013 3AE'), ('669 A03'), ('02 AC3'),
  ('69 AC3'), ('805 AC3'), ('AC3 805'), ('526 ACS'), ('669 AC3')
) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for ARAIES
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'ARAIES')
FROM (VALUES ('1229'), ('47 ARAES'), ('47'), ('0605 ARAES'), ('01 NRE'), ('605 ARAES')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for AVENSIS
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'AVENSIS')
FROM (VALUES ('3379'), ('2780'), ('1324'), ('2756')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for BALL FARMS
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'BALL FARMS')
FROM (VALUES ('54'), ('43'), ('47 BALL'), ('52 BALL'), ('47 ARAES'), ('54 BALL')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for BOWEN SERVICES
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'BOWEN SERVICES')
FROM (VALUES ('359'), ('6'), ('06 BOWEN')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for BROSS
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'BROSS')
FROM (VALUES ('205 BROSS'), ('205'), ('221 BROSS'), ('B213'), ('221'), ('B 213')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for CL TRUCKING
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'CL TRUCKING')
FROM (VALUES ('5 CL')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for CULPEPPER
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'CULPEPPER')
FROM (VALUES ('11 LBK')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for FOX TRANSPORTATION
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'FOX TRANSPORTATION')
FROM (VALUES ('S349'), ('S 349')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for ISM
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'ISM')
FROM (VALUES ('004'), ('006 ISM'), ('8349'), ('4'), ('6')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for JOAT ONE ENTERPRISES
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'JOAT ONE ENTERPRISES')
FROM (VALUES ('111 JOAT'), ('111')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for K KAY'S TRUCKING
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'K KAY''S TRUCKING')
FROM (VALUES ('110 KK'), ('112 KK'), ('102 KK'), ('100 KK')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for MAAVS
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'MAAVS')
FROM (VALUES 
  ('1138 MAAVS'), ('1119 MAAVS'), ('3076 MAAVS'), ('1135 MAAVS'), ('57 MAAVS'),
  ('220 MAAVS'), ('1135'), ('3076'), ('1136 MAAVS'), ('1122 MAAVS'), ('A2 MAAVS'),
  ('820'), ('12 R'), ('12R')
) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for NEWRISE ENTERPRISES
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'NEWRISE ENTERPRISES')
FROM (VALUES ('02 NR'), ('02 NRE'), ('01 NRE')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for RMC
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'RMC')
FROM (VALUES ('11'), ('RMC 11'), ('11 TRIPPEL')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for SCHLUCHT
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'SCHLUCHT')
FROM (VALUES ('1258')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for SMASH INDUSTRIES
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'SMASH INDUSTRIES')
FROM (VALUES ('1002 SMASH'), ('217 SMASH'), ('2003'), ('1002')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for T&F SAND
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'T&F SAND')
FROM (VALUES ('34 T&F')) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

-- Insert trucks for TRU AVANT
INSERT INTO trucks (truck_id, carrier_id) 
SELECT v, (SELECT id FROM carriers WHERE name = 'TRU AVANT')
FROM (VALUES 
  ('02 TNA'), ('3 TNA'), ('4 TNA'), ('5 TNA'), ('6 TNA'), ('7 TNA'), ('8 TNA'),
  ('9 TNA'), ('10 TNA'), ('02 DA3'), ('03 DA3')
) AS t(v)
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

