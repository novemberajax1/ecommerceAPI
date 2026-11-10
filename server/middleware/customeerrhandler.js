const error_handler = (err, req, res, next) => {
  //the actual error is logged at error level
  if (res.headersSent) {
    return next(err);
  }
  //unexcpected
  console.error(err); //showing at the error level
  return res.status(500).send({
    error: "Internal server error",
  });
};

export default error_handler;
