module.exports = {
  ok(data = {}) { return { success: true, ...data }; },
  fail(msg, code = 400) { return { success: false, error: msg, code }; }
};
