function registerErrorHandlers(app) {
  app.use((req, res) => {
    res.status(404).render('errors/404', {
      title: 'Page not found',
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    const message = err.message || 'Something went wrong.';
    res.status(err.status || 500).render('errors/500', {
      title: 'Error',
      err: { message },
    });
  });
}

module.exports = { registerErrorHandlers };
