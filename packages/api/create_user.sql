-- Clean up broken user
DELETE FROM users WHERE email = 'admin@dunnaa.com.br';

-- Insert correct user with escaped hash (though content in file is safe from shell expansion when piped)
INSERT INTO users (id, email, hashed_password, name, role, phone, created_at, updated_at) 
VALUES (
    gen_random_uuid(), 
    'admin@dunnaa.com.br', 
    '$2b$12$7577yuOqTUMbvPTpRKdk8.W4H503ATFCEAsVRtr1vlnZgpBuc9aeW', 
    'Admin BR', 
    'admin', 
    '5511999999999', 
    NOW(), 
    NOW()
);
