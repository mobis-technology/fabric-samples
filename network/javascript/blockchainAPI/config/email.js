module.exports.ViewOption = (transport, hbs,template) => {
    transport.use('compile', hbs({
        viewEngine: {
            extName: '.hbs',
            partialsDir: 'views/email/',
            layoutsDir: 'views/email/',
            defaultLayout: '',
        },
        viewPath: 'views/email/',
        extName: '.hbs',
    }));
};
