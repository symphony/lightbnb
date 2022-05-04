DROP TABLE IF EXISTS users, properties, reservations, property_reviews;

CREATE TABLE users (
  id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255)
);

CREATE TABLE properties (
  id SERIAL PRIMARY KEY NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  thumbnail_photo_url VARCHAR(255),
  cover_photo_url VARCHAR(255),
  cost_per_night SMALLINT,
  parking_spaces SMALLINT,
  number_of_bathrooms SMALLINT,
  country_id INTEGER,
  street VARCHAR(255),
  city VARCHAR(255),
  province_id INTEGER,
  postal_code VARCHAR(20),
  active BOOLEAN DEFAULT false
);

CREATE TABLE reservations (
  id SERIAL PRIMARY KEY NOT NULL,
  start_date DATE,
  end_date DATE,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE property_reviews (
  id SERIAL PRIMARY KEY NOT NULL,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE,
  rating SMALLINT,
  review TEXT
);