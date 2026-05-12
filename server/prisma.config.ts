module.exports = {
  datasource: {
    db: {
      provider: 'mongodb',
      url: process.env.DATABASE_URL,
    },
  },
};
