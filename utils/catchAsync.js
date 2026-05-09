module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(err => {
      if (typeof next === 'function') {
        next(err);
      } else {
        console.error('CRITICAL: next is not a function in catchAsync. Underlying Error:', err);
        if (!res.headersSent) {
          res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        }
      }
    });
  };
};