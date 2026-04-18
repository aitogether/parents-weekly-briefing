// 数据库操作封装
const db = cloudbase.database();

module.exports = {
  async query(collection, filter, options = {}) {
    const { page = 1, limit = 20, orderBy = '_id', order = 'desc' } = options;
    let query = db.collection(collection).where(filter);
    if (orderBy) query = query.orderBy(orderBy, order);
    const skip = (page - 1) * limit;
    const results = await query.skip(skip).limit(limit).get();
    const total = await query.count();
    return { list: results.data, total: total.total, page, totalPages: Math.ceil(total.total / limit) };
  },
  
  async transaction(callback) {
    const session = await db.startTransaction();
    try {
      const result = await callback(session);
      await session.commit();
      return result;
    } catch (error) {
      await session.rollback();
      throw error;
    }
  }
};
