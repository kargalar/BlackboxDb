INSERT INTO content_type_lookup (id, name) VALUES (1, 'movie'), (2, 'tv'), (3, 'game'), (4, 'book') ON CONFLICT (id) DO NOTHING;
