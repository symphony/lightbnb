// Set up and run database
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PG_USER,
  password: process.env.KEY,
  host: process.env.HOST,
  database: process.env.DB
});

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
  return pool
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
const getAllProperties = function(options, limit = 10) {
  // helper wip for get all properties with options
  // const buildString = function(acc, [name, value]) {
  //   let i = 0;
  //   return () => {
  //     console.log('\nacc', acc, '\nname', name, '\nvalue', value, '\nindex', i);
  //     if (!value) return acc;
  //     i++;
  //     city = () => [`city LIKE $${i + 1}`, `%${value.trim().slice(1)}%`],
  //     owner_id = () => [`owner_id = $${i + 1} `, value],
  //     minimum_price_per_night = () => [`cost_per_night >= $${i + 1}`, value * 100],
  //     maximum_price_per_night = () => [`cost_per_night <= $${i + 1}`, value * 100 || 2147483647],
  //     acc[0].push(this[name]()[0]);
  //     acc[1].push(this[name]()[1]);
  //     return acc;
  //   }
  // }();
  // const [optionsArr, queryParams] = Object.entries(options).reduce(buildString, [[], []]);
  // console.log('options:\n' + optionsArr.join('\nAND '), queryParams);
  // if (optionsArr.length) queryString += '\nWHERE ' + optionsArr.join('\nAND ');

  const queryParams = []
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // append optional parameters
  const and = () => queryParams.length > 1 ? 'AND' : 'WHERE';
  if (options.city) {
    const city = options.city.trim().slice(1);
    queryParams.push(`%${city}%`);
    queryString += `\n${and()} city LIKE $${queryParams.length}`;
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `\n${and()} owner_id = $${queryParams.length}`;
  }

  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryString += `\n${and()} cost_per_night >= $${queryParams.length}`;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `\n${and()} cost_per_night <= $${queryParams.length}`;
  }

  queryString += `
  GROUP BY properties.id
  `;

  // HAVING condition
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `\nHAVING avg(property_reviews.rating) >= $${queryParams.length}`;
  }

  // last section of query string. add limit parameter
  queryParams.push(limit);
  queryString += `
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
  if (Object.values(property).includes('')) return Promise.reject('Property not added. Incomplete input fields');

  // map values from form submission to individual arrays
  const columns = Object.keys(property);
  const values = columns.map((k) => property[k]);
  const indexes = columns.map((v, i) => `$${i+1}`);

  // spread dynamic values into template
  const queryString = `
  INSERT INTO properties (${columns.join()})
  VALUES (${indexes.join()})
  RETURNING *;
  `;

  // perform insert
  return pool
    .query(queryString, values)
    .then((res) => {
      return res.rows[0] || null;
    })
    .catch((err) => {
      console.log('Error adding property:', err?.message || err);
    });
};
exports.addProperty = addProperty;