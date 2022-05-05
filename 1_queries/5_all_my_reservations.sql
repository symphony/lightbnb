SELECT properties.id as id, title, start_date, cost_per_night, avg(rating) as average_rating
FROM properties
JOIN reservations ON property_id = properties.id
JOIN property_reviews ON reservation_id = reservations.id
WHERE reservations.guest_id = 1
GROUP BY properties.id, start_date
ORDER BY cost_per_night desc;