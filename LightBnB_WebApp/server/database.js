const properties = require('./json/properties.json');
const users = require('./json/users.json');


// Set up and run database
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PG_USER,
  password: process.env.KEY,
  host: process.env.HOST,
  database: process.env.DB
});

pool.connect();


/// Users
/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1;`, [email.toLowerCase()])
    .then((res) => {
      return res.rows[0] || null;
    })
    .catch((err) => {
      console.log('Error getting user with email:', err?.message || err);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1;`, [id])
    .then((res) => {
      return res.rows[0] || null;
    })
    .catch((err) => {
      console.log('Error getting user with id:', err?.message || err);
    });
};
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  // Have to manually specify each key name so the order stays consistent
  const values = [user.name, user.email, user.password];
  pool
    .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3)
    RETURNING *`, values)
    .then((res) => {
      return res.rows[0];
    })
    .catch((err) => {
      console.log('Error adding user:', err?.message || err);
    });
};
exports.addUser = addUser;


/// Reservations
/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const values = [guest_id, limit];
  return pool
    .query(`
    SELECT reservations.*, properties.*, avg(rating) as average_rating
    FROM properties
    JOIN reservations ON property_id = properties.id
    JOIN property_reviews ON reservation_id = reservations.id
    WHERE reservations.guest_id = $1
    GROUP BY properties.id, reservations.id
    ORDER BY cost_per_night desc
    LIMIT $2;`, values)
    .then((res) => {
      return res.rows;
    })
    .catch((err) => {
      console.log('Error getting reservations:', err?.message || err);
    });
};
exports.getAllReservations = getAllReservations;

/// Properties
/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  const queryParams = [];
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  if (options.city) {
    queryParams.push(`%${options.city.slice(1)}%`);
    queryString += `\n\tWHERE city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `\n\tAND owner_id = $${queryParams.length}`;
  }

  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryString += `\n\tAND price_per_night >= $${queryParams.length}`;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `\n\tAND price_per_night <= $${queryParams.length}`;
  }

  if (options.minimum_rating ) {
    queryParams.push(options.minimum_rating);
    queryString += `\n\tAND rating >= $${queryParams.length}`;
  }


  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  return pool
  .query(queryString, queryParams)
  .then((res) => {
    return res.rows.length ? res.rows : null;
  })
  .catch((err) => {
    console.log('Error getting all properties:', err?.message || err);
  });
};
exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};
exports.addProperty = addProperty;