require(['gitbook', 'jQuery'], function (gitbook, $) {
    var versions = [],
        current  = undefined,
        pluginConfig = {},
        defaultVersion;

    // Update the select with a list of versions
    function updateVersions(_versions) {
        versions = _versions || versions;
        current  = $('.versions-select select').val();

        // Cleanup existing selector
        $('.versions-select').remove();

        if (versions.length == 0) return;

        var $li = $('<div>', {
            'class': 'versions-select',
            'html': 'Version: <select></select>'
        });
        var $select = $li.find('select');

        $.each(versions, function(i, version) {
            var $option = $('<option>', {
                'selected': (current === undefined ? version.selected : (current === version.value)),
                'value': version.value,
                'text': version.text
            });

            $option.appendTo($select);
        });

        $select.change(function() {
            var filtered = $.grep(versions, function(v) {
                return v.value === $select.val();
            });
            // Get actual version Object from array
            var version = filtered[0];

            var filePath = location.href.replace(gitbook.state.bookRoot, '');
            window.location.href = version.includeFilepath ? (version.value + filePath) : version.value;
        });

        // $li.prependTo('.book-summary ul.summary');
        $li.appendTo(pluginConfig.container);
    }

    // Fetch version from book.json (legacy plugin)
    function fetchBookOptionsVersions(gitbookConfigURL) {
        $.getJSON(gitbookConfigURL, function (bookConfig) {
            var options = bookConfig.pluginsConfig.versions.options;
            updateVersions(options);
        });
    }
    
    // 
    function sortVersionsByName(a, b){
        a.text.toLowerCase() < b.text.toLowerCase(); 
    }

    function mapBookVersions(versions, type){
        var languageLanding = window.location.pathname != '/' && window.location.pathname.substring(0, 3) != '/v/';
        
        return $.map(versions, function(v) {
            // remove 'matser'
            if(v.name === 'master') {
                return;
            }
            
            // set defaultVersion
            var endsWith = 'v/' + v.name + '/';
            if(v.urls.website.slice(-endsWith.length) !== endsWith) {
                defaultVersion = v.name;
            }
            
            return {
                text: v.name,
                value: v.urls.website.replace(/^http:\/\//i, 'https://'),
                selected: v.current,
                includeFilepath: pluginConfig.includeFilepath !== false && type !== 'languages'
            };
            
        }).sort(sortVersionsByName);
    }
    
    function updateDisqus(){
        var languageLanding = window.location.pathname != '/' && window.location.pathname.substring(0, 3) != '/v/';
        if(!window.DISQUS || !languageLanding){
            return; 
        }
        
        // update DISQUS with version URL
        var filePath = window.location.href.replace(gitbook.state.bookRoot, '');
        var location = gitbook.state.bookRoot + 'v/' + defaultVersion + '/' + filePath;
        location = location.replace(/^http:\/\//i, 'https://');
        console.log('set DISQUS url', location);
        DISQUS.reset({
            reload: true,
            config: function () {  
                this.page.identifier = location;  
                this.page.url = location;
            }
        });
    }
    
    // Fetch gitbook.com versions
    function fetchBookVersions(type) {
        $.getJSON(gitbook.state.bookRoot+'gitbook/api/versions/'+type, function (v) {
            var versions = mapBookVersions(v, type);
            console.log('sorted versions', versions);
            updateDisqus();
            updateVersions(versions);
        });
    }

    gitbook.events.bind('start', function (e, config) {
        pluginConfig = config.versions || {};
        if (pluginConfig.options) updateVersions(pluginConfig.options);

        // Make sure we have a current book.json
        if (pluginConfig.gitbookConfigURL)  fetchBookOptionsVersions(pluginConfig.gitbookConfigURL);
        else fetchBookVersions(pluginConfig.type || 'branches');
    });

    gitbook.events.bind('page.change', function () {
        updateDisqus();
        updateVersions();
    });
});
