Package.describe({
    summary: "Notebook - Web App and Admin Template (v.1.1.0), fully responsive web application and admin dashboard template, from Flatfull, packaged for Meteor.js."
});

Package.on_use(function (api) {
    api.use([
        'less',
        'jquery'
    ]);

    var path = Npm.require('path');
    var asset_path = path.join('MvpReady-theme');

    // CSS
    api.add_files(path.join(asset_path, 'css', 'bootstrap.css'), 'client');
    api.add_files(path.join(asset_path, 'css', 'mvpready-admin.css'), 'client');
        //api.add_files(path.join(asset_path, 'css', 'mvpready-admin-slate.css'), 'client');
    api.add_files(path.join(asset_path, 'css', 'mvpready-flat.css'), 'client');
    api.add_files(path.join(asset_path, 'css', 'font-awesome.min.css'), 'client');
    //Spinnr
    api.add_files(path.join(asset_path, 'css', 'style.css'), 'client');
    api.add_files(path.join(asset_path, 'css', 'demo.css'), 'client');
    api.add_files(path.join(asset_path, 'css', 'estilos.css'), 'client');


    api.add_files(path.join(asset_path, 'fonts', 'FontAwesome.otf'), 'client');
    api.add_files(path.join(asset_path, 'fonts', 'fontawesome-webfont.eot'), 'client');
    api.add_files(path.join(asset_path, 'fonts', 'fontawesome-webfont.svg'), 'client');
    api.add_files(path.join(asset_path, 'fonts', 'fontawesome-webfont.ttf'), 'client');
    api.add_files(path.join(asset_path, 'fonts', 'fontawesome-webfont.woff'), 'client');

    api.add_files(path.join(asset_path, 'fonts', 'glyphicons-halflings-regular.ttf'), 'client');
    api.add_files(path.join(asset_path, 'fonts', 'glyphicons-halflings-regular.woff'), 'client');
    api.add_files(path.join(asset_path, 'fonts', 'glyphicons-halflings-regular.svg'), 'client');




    // JS
    api.add_files(path.join(asset_path, 'js', 'libs', 'jquery-1.10.2.min.js'), 'client');
    //api.add_files(path.join(asset_path, 'js', 'jquery-migrate-1.2.1.min.js'), 'client');
    api.add_files(path.join(asset_path, 'js', 'libs', 'bootstrap.min.js'), 'client');

    //Jmpress
    //api.add_files(path.join(asset_path, 'js', 'libs', 'modernizr.custom.48780.js'), 'client');

    api.add_files(path.join(asset_path, 'js', 'libs', 'jmpress.js'), 'client');
    api.add_files(path.join(asset_path, 'js', 'libs', 'jquery.jmslideshow.js'), 'client');
    //WaveSurfer
    //api.add_files(path.join(asset_path, 'js', 'libs', 'wavesurfer.min.js'), 'client');
    api.add_files(path.join(asset_path, 'js', 'libs', 'soundcloud-sdk.js'), 'client');

    //PageScripts
    //api.add_files(path.join(asset_path, 'js', 'plugins', 'flot', 'jquery-ui-1.10.3.custom.min.js'), 'client');
    //api.add_files(path.join(asset_path, 'js', 'jquery.ui.touch-punch.min.js'), 'client');
    //api.add_files(path.join(asset_path, 'js', 'jquery.sparkline.min.js'), 'client');
    //api.add_files(path.join(asset_path, 'js', 'fullcalendar.min.js'), 'client');
    api.add_files(path.join(asset_path, 'js', 'plugins', 'flot', 'jquery.flot.js'), 'client');
    api.add_files(path.join(asset_path, 'js', 'plugins', 'flot', 'jquery.flot.pie.js'), 'client');
    //api.add_files(path.join(asset_path, 'js', 'jquery.flot.stack.min.js'), 'client');
    api.add_files(path.join(asset_path, 'js', 'plugins', 'flot', 'jquery.flot.resize.js'), 'client');
    api.add_files(path.join(asset_path, 'js', 'plugins', 'flot', 'jquery.flot.tooltip.min.js'), 'client');
    //api.add_files(path.join(asset_path, 'js', 'jquery.flot.time.min.js'), 'client');

    //api.add_files(path.join(asset_path, 'js', 'mvpready-core.js'), 'client');
    //api.add_files(path.join(asset_path, 'js', 'mvpready-admin.js'), 'client');


  
});
