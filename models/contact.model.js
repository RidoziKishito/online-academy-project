import db from '../utils/db.js';

const TABLE_NAME = 'contact_messages';

export function add(message) {
  // message: { name, email, message }
  return db(TABLE_NAME).insert(message).returning('id');
}

export default { add };
