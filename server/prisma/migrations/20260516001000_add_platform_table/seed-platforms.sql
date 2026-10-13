-- Seed default platforms
INSERT INTO "platform" ("name", "slug") VALUES
    ('Windows', 'windows'),
    ('PlayStation 5', 'ps5'),
    ('PlayStation 4', 'ps4'),
    ('PlayStation 3', 'ps3'),
    ('PlayStation 2', 'ps2'),
    ('PlayStation', 'ps1'),
    ('Xbox Series X/S', 'xbox-series'),
    ('Xbox One', 'xbox-one'),
    ('Xbox 360', 'xbox-360'),
    ('Nintendo Switch', 'switch'),
    ('Nintendo 3DS', '3ds'),
    ('Nintendo Wii U', 'wii-u'),
    ('Nintendo Wii', 'wii'),
    ('Steam Deck', 'steam-deck'),
    ('macOS', 'macos'),
    ('Linux', 'linux'),
    ('iOS', 'ios'),
    ('Android', 'android'),
    ('Web Browser', 'web'),
    ('VR', 'vr')
ON CONFLICT DO NOTHING;
