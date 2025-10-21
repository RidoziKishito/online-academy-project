import db from '../utils/db.js';

const TABLE_NAME = 'users';

export function findAll() {
  return db(TABLE_NAME).where('role', 'instructor');
}

export function add(instructor) {
  const instructorData = { ...instructor, role: 'instructor' };
  return db(TABLE_NAME).insert(instructorData);
}

export function findById(id) {
  return db(TABLE_NAME).where('user_id', id).andWhere('role', 'instructor').first();
}

export function del(id) {
  return db(TABLE_NAME).where('user_id', id).andWhere('role', 'instructor').del();
}

export function patch(id, instructor) {
  delete instructor.role; 
  return db(TABLE_NAME).where('user_id', id).andWhere('role', 'instructor').update(instructor);
}