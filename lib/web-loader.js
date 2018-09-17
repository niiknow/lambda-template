import nunjucks from 'nunjucks'

var WebLoader = nunjucks.Loader.extend({
    init: function() {
        // setup a process which watches templates here
        // and call `this.emit('update', name)` when a template
        // is changed
    },

    getSource: function(name) {
        // load the template
    }
});

export default WebLoader;
