-- Execute this script in psql to set up the database.
-- Run: psql -U postgres -f setup_db.sql

-- 1. Create User (if not exists)
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'user') THEN

      CREATE ROLE "user" LOGIN PASSWORD 'password';
   END IF;
END
$do$;

-- 2. Create Database (if not exists)
SELECT 'CREATE DATABASE census_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'census_db')\gexec

-- 3. Grant Privileges
GRANT ALL PRIVILEGES ON DATABASE census_db TO "user";
ALTER DATABASE census_db OWNER TO "user";
