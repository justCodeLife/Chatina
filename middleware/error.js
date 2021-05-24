const errorHandler = (err, req, res, next) => {
    let error = {...err};
    error.message = err.message;
    console.log(err.stack);
    // if (err.name === 'CastError') {
    //     const message = `Resource not found`;
    // }
    // if (err.code === 11000) {
    //     const message = 'Duplicate field value entered';
    // }
    // if (err.name === 'ValidationError') {
    //     const message = Object.values(err.errors).map(val => val.message);
    // }
    res.status(error.statusCode || 500).json({success: false, error: error.message || 'Server Error'});
};
module.exports = errorHandler;
