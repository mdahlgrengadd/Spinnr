var TracksArray = new Array();

Waveform = new Meteor.Collection("Waveform", {
    schema: {
        StreamURL: {
            type: String,
                  //decimal: true,
            label: "Stream URL"
            //min: 0
        },
        isActive: {
            type: Boolean,
            label: "The currently playing item",
            optional: true,
            autoValue: function() { return this.value || false; }
        },
        MainRegionStart: {
            type: Number,
                  decimal: true,
                  optional: true,
            label: "Start of Main Region"
            //min: 0
        },
        MainRegionEnd: {
            type: Number,
                  decimal: true,
                  optional: true,
            label: "End of Main Region"
            //min: 0
        },
    }
});


function getActiveTrack(){
    var result = 0;
    var w = Waveform.find({});
    w.forEach(function(item) {
        console.log(item.isActive);
        if(item.isActive) {
            result = item._id;
        }
    });

    return result;
}

function updateRegion(track_id) {
            var result = $.grep(TracksArray, function(e){ return e.track_id == track_id; });

            var ws = result[0].wavesurfer;

            if(ws) {
            var sel = ws.getSelection();
            if (sel) {
                var reg = ws.region(
                  {'id': "Main-"+track_id, 
                  'startPosition': sel.startPosition, 
                  'endPosition': sel.endPosition, 
                  'color': "rgba(0, 0, 255, 0.2)"
                });
                if (reg) reg.on('out', function (){
                        console.log("Entered region: ");
                        //wavesurfer.stop();
                        playNext();
                    });
                //Save result to database
                Waveform.update({_id: track_id}, {$set: {MainRegionStart: sel.startPosition}});
                Waveform.update({_id: track_id}, {$set: {MainRegionEnd: sel.endPosition}});
                ws.updateSelection(0, 0); //clear the selection
              }

            }
}

function playNext() {
        var activetrack = getActiveTrack();
        var result = $.grep(TracksArray, function(e){ return e.track_id == activetrack; });
        var nexttrack = TracksArray.indexOf(result[0]) + 1;
        if (nexttrack > TracksArray.length-1) nexttrack = 0;

        var wf = Waveform.find({});
        wf.forEach(function(w) {
            if(w._id === TracksArray[nexttrack].track_id) {
                console.log("Gonna play: " + w.StreamURL + " - is Active: "+ w.isActive);
                // reactive programming. meteor will trigger a change event in database which will cause the music to play if isActive is true...
                Waveform.update({_id: w._id}, {$set: {isActive: true}}); 
                //var result = $.grep(TracksArray, function(e){ return e.track_id == item; });
                //console.log(result[0].wavesurfer);
                //wavesurfer.play();
            } else {if (w.isActive  == true) Waveform.update({_id: w._id}, {$set: {isActive: false}});}

        }); 
}

if(Meteor.isClient) {
        // DB cursor to find all posts with 'important' in the tags array.
    var cursor = Waveform.find({});

    // watch the cursor for changes
    var handle = cursor.observe({
      added: function (track) { }, // run when post is added
      changed: function (track) {
        var result = $.grep(TracksArray, function(e){ return e.track_id == track._id; });
        var ws = result[0].wavesurfer;
        if (track.isActive) {

            //var sel = ws.getSelection();
            if (track.MainRegionStart && track.MainRegionEnd) {
                ws.play(track.MainRegionStart);//, track.MainRegionEnd);
            } else ws.play();
        }
        else ws.stop();

        //Update the region (make sure updates shows on all connected clients)
        var reg = ws.region(
                      {'id': "Main-"+track._id, 
                      'startPosition': track.MainRegionStart, 
                      'endPosition': track.MainRegionEnd, 
                      'color': "rgba(0, 0, 255, 0.2)"
        });
        if (reg) reg.on('out', function (){
                            console.log("Entered region: ");
                            //wavesurfer.stop();
                            playNext();
                        });
        console.log("VALUE CHANGED: "+ track.isActive); 
      }, // run when post is changed
      removed: function (track) {  } // run when post is removed
    });

}








if (Meteor.isServer) {
  Meteor.publish("Waveform", function() {
    return Waveform.find({}, {sort: {date: -1}});
  });

//Allow client removals
  Waveform.allow({
    'remove': function (userId,doc) {
      /* user and doc checks ,
      return true to allow insert */
      return true; 
    }
  });

//Clear waveform db
//Waveform.remove({});


}//isServer
if (Meteor.isServer) {

  /*  Initialize Waveform DB  */
  //Waveform.insert({StreamURL: "https://soundcloud.com/martindahlgren/d-i-s-c-o"}, function(error, result) {
    //The insert will fail, error will be set,
    //and result will be undefined or false because "copies" is required.
    //
    //The list of errors is available on `error.invalidKeys` or by calling Waveform.simpleSchema().namedContext().invalidKeys()
    //alert(error.message);
  //});
}

if (Meteor.isClient) {

var WaveSurfer = {
    defaultParams: {
        height        : 128,
        waveColor     : '#999',
        progressColor : '#555',
        cursorColor   : '#333',
        selectionColor: '#0fc',
        selectionBorder: false,
        selectionForeground: false,
        selectionBorderColor: '#000',
        cursorWidth   : 1,
        markerWidth   : 2,
        skipLength    : 2,
        minPxPerSec   : 50,
        pixelRatio    : window.devicePixelRatio,
        fillParent    : true,
        scrollParent  : false,
        hideScrollbar : false,
        normalize     : false,
        audioContext  : null,
        container     : null,
        dragSelection : true,
        loopSelection : true,
        audioRate     : 1,
        interact      : true,
        renderer      : 'Canvas',
        backend       : 'WebAudioBuffer'
    },

    init: function (params) {
        // Extract relevant parameters (or defaults)
        this.params = WaveSurfer.util.extend({}, this.defaultParams, params);

        this.container = 'string' == typeof params.container ?
            document.querySelector(this.params.container) :
            this.params.container;

        if (!this.container) {
            throw new Error('wavesurfer.js: container element not found');
        }

        // Marker objects
        this.markers = {};
        this.once('marked', this.bindMarks.bind(this));
        this.once('region-created', this.bindRegions.bind(this));

        // Region objects
        this.regions = {};

        // Used to save the current volume when muting so we can
        // restore once unmuted
        this.savedVolume = 0;
        // The current muted state
        this.isMuted = false;

        this.bindUserAction();
        this.createDrawer();
        this.createBackend();
    },

    bindUserAction: function () {
        // iOS requires user input to start loading audio
        var my = this;
        var onUserAction = function () {
            my.fireEvent('user-action');
        };
        document.addEventListener('mousedown', onUserAction);
        document.addEventListener('keydown', onUserAction);
        this.on('destroy', function () {
            document.removeEventListener('mousedown', onUserAction);
            document.removeEventListener('keydown', onUserAction);
        });
    },

    /**
     * Used with loadStream.
     * TODO: move to WebAudioMedia
     */
    createMedia: function (url) {
        var my = this;

        var media = document.createElement('audio');
        media.controls = false;
        media.autoplay = false;
        media.src = url;

        media.addEventListener('error', function () {
            my.fireEvent('error', 'Error loading media element');
        });

        media.addEventListener('canplay', function () {
            my.fireEvent('media-canplay');
        });

        var prevMedia = this.container.querySelector('audio');
        if (prevMedia) {
            this.container.removeChild(prevMedia);
        }
        this.container.appendChild(media);

        return media;
    },

    createDrawer: function () {
        var my = this;

        this.drawer = Object.create(WaveSurfer.Drawer[this.params.renderer]);
        this.drawer.init(this.container, this.params);

        this.drawer.on('redraw', function () {
            my.drawBuffer();
            my.drawer.progress(my.backend.getPlayedPercents());
        });

        this.on('progress', function (progress) {
            my.drawer.progress(progress);
        });

        // Click-to-seek
        this.drawer.on('mousedown', function (progress) {
            setTimeout(function () {
                my.seekTo(progress);
            }, 0);
        });

        // Delete Mark on handler dble click
        this.drawer.on('mark-dblclick', function (id) {
            var mark = my.markers[id];
            if (mark) {
                mark.remove();
            }
        });

        // Drag selection or marker events
        if (this.params.dragSelection) {
            this.drawer.on('drag', function (drag) {
                my.dragging = true;
                my.updateSelection(drag);
            });
            // Clear selection on canvas dble click
            this.drawer.on('drag-clear', function () {
                my.clearSelection();
            });
        }

        this.drawer.on('drag-mark', function (drag, mark) {
            mark.fireEvent('drag', drag);
        });

        // Mouseup for plugins
        this.drawer.on('mouseup', function (e) {
            my.fireEvent('mouseup', e);
            my.dragging = false;
        });

        // Mouse events for Regions
        this.drawer.on('region-over', function (region, e) {
            region.fireEvent('over', e);
            my.fireEvent('region-over', region, e);
        });
        this.drawer.on('region-leave', function (region, e) {
            region.fireEvent('leave', e);
            my.fireEvent('region-leave', region, e);
        });
        this.drawer.on('region-click', function (region, e) {
            region.fireEvent('click', e);
            my.fireEvent('region-click', region, e);
        });

        // Mouse events for Marks
        this.drawer.on('mark-over', function (mark, e) {
            mark.fireEvent('over', e);
            my.fireEvent('mark-over', mark, e);
        });
        this.drawer.on('mark-leave', function (mark, e) {
            mark.fireEvent('leave', e);
            my.fireEvent('mark-leave', mark, e);
        });
        this.drawer.on('mark-click', function (mark, e) {
            mark.fireEvent('click', e);
            my.fireEvent('mark-click', mark, e);
        });
    },

    createBackend: function () {
        var my = this;

        if (this.backend) {
            this.backend.destroy();
        }

        this.backend = Object.create(WaveSurfer[this.params.backend]);

        this.backend.on('play', function () {
            my.fireEvent('play');
            my.restartAnimationLoop();
        });

        this.backend.on('finish', function () {
            my.fireEvent('finish');
        });

        try {
            this.backend.init(this.params);
        } catch (e) {
            if (e.message == 'wavesurfer.js: your browser doesn\'t support WebAudio') {
                this.params.backend = 'AudioElement';
                this.backend = null;
                this.createBackend();
            }
        }
    },

    restartAnimationLoop: function () {
        var my = this;
        var requestFrame = window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame;
        var frame = function () {
            if (!my.backend.isPaused()) {
                my.fireEvent('progress', my.backend.getPlayedPercents());
                requestFrame(frame);
            }
        };
        frame();
    },

    getDuration: function () {
        return this.backend.getDuration();
    },

    getCurrentTime: function () {
        return this.backend.getCurrentTime();
    },

    play: function (start, end) {
        this.backend.play(start, end);
    },

    pause: function () {
        this.backend.pause();
    },

    playPause: function () {
        this.backend.isPaused() ? this.play() : this.pause();
    },

    playPauseSelection: function () {
        var sel = this.getSelection();
        if (sel !== null) {
            this.seekTo(sel.startPercentage);
            this.playPause();
        }
    },

    skipBackward: function (seconds) {
        this.skip(seconds || -this.params.skipLength);
    },

    skipForward: function (seconds) {
        this.skip(seconds || this.params.skipLength);
    },

    skip: function (offset) {
        var timings = this.timings(offset);
        var progress = timings[0] / timings[1];

        this.seekTo(progress);
    },

    seekAndCenter: function (progress) {
        this.seekTo(progress);
        this.drawer.recenter(progress);
    },

    seekTo: function (progress) {
        var paused = this.backend.isPaused();
        // avoid small scrolls while paused seeking
        var oldScrollParent = this.params.scrollParent;
        if (paused) {
            this.params.scrollParent = false;
            // avoid noise while seeking
            this.savedVolume = this.backend.getVolume();
            this.backend.setVolume(0);
        }
        this.play((progress * this.drawer.width) / this.realPxPerSec);
        if (paused) {
            this.pause();
            this.backend.setVolume(this.savedVolume);
        }
        this.params.scrollParent = oldScrollParent;
        this.fireEvent('seek', progress);
    },

    stop: function () {
        this.pause();
        this.seekTo(0);
        this.drawer.progress(0);
    },

    /**
     * Set the playback volume.
     *
     * @param {Number} newVolume A value between 0 and 1, 0 being no
     * volume and 1 being full volume.
     */
    setVolume: function (newVolume) {
        this.backend.setVolume(newVolume);
    },

    /**
     * Toggle the volume on and off. It not currenly muted it will
     * save the current volume value and turn the volume off.
     * If currently muted then it will restore the volume to the saved
     * value, and then rest the saved value.
     */
    toggleMute: function () {
        if (this.isMuted) {
            // If currently muted then restore to the saved volume
            // and update the mute properties
            this.backend.setVolume(this.savedVolume);
            this.isMuted = false;
        } else {
            // If currently not muted then save current volume,
            // turn off the volume and update the mute properties
            this.savedVolume = this.backend.getVolume();
            this.backend.setVolume(0);
            this.isMuted = true;
        }
    },

    toggleScroll: function () {
        this.params.scrollParent = !this.params.scrollParent;
        this.drawBuffer();
    },

    mark: function (options) {
        var my = this;

        var opts = WaveSurfer.util.extend({
            id: WaveSurfer.util.getId(),
            width: this.params.markerWidth
        }, options);

        if (opts.percentage && !opts.position) {
            opts.position = opts.percentage * this.getDuration();
        }
        opts.percentage = opts.position / this.getDuration();

        // If exists, just update and exit early
        if (opts.id in this.markers) {
            return this.markers[opts.id].update(opts);
        }

        // Ensure position for a new marker
        if (!opts.position) {
            opts.position = this.getCurrentTime();
            opts.percentage = opts.position / this.getDuration();
        }

        var mark = Object.create(WaveSurfer.Mark);
        mark.init(opts);

        // If we create marker while dragging we are creating selMarks
        if (this.dragging) {
            mark.type = 'selMark';
            mark.on('drag', function (drag){
                my.updateSelectionByMark(drag, mark);
            });
        } else {
            mark.on('drag', function (drag){
                my.moveMark(drag, mark);
            });
        }

        mark.on('update', function () {
            my.drawer.updateMark(mark);
            my.fireEvent('mark-updated', mark);
        });
        mark.on('remove', function () {
            my.drawer.removeMark(mark);
            delete my.markers[mark.id];
            my.fireEvent('mark-removed', mark);
        });

        this.drawer.addMark(mark);

        this.markers[mark.id] = mark;
        this.fireEvent('marked', mark);

        return mark;
    },

    clearMarks: function () {
        Object.keys(this.markers).forEach(function (id) {
            this.markers[id].remove();
        }, this);
        this.markers = {};
    },

    redrawRegions: function () {
        Object.keys(this.regions).forEach(function (id) {
            this.region(this.regions[id]);
        }, this);
    },

    clearRegions: function () {
        Object.keys(this.regions).forEach(function (id) {
            this.regions[id].remove();
        }, this);
        this.regions = {};
    },

    region: function (options) {
        var my = this;

        var opts = WaveSurfer.util.extend({
            id: WaveSurfer.util.getId()
        }, options);

        opts.startPercentage = opts.startPosition / this.getDuration();
        opts.endPercentage = opts.endPosition / this.getDuration();

        // If exists, just update and exit early
        if (opts.id in this.regions) {
            return this.regions[opts.id].update(opts);
        }

        var region = Object.create(WaveSurfer.Region);
        region.init(opts);

        region.on('update', function () {
            my.drawer.updateRegion(region);
            my.fireEvent('region-updated', region);
        });
        region.on('remove', function () {
            my.drawer.removeRegion(region);
            my.fireEvent('region-removed', region);
            delete my.regions[region.id];
        });

        this.drawer.addRegion(region);

        this.regions[region.id] = region;
        this.fireEvent('region-created', region);

        return region;

    },

    timings: function (offset) {
        var position = this.getCurrentTime() || 0;
        var duration = this.getDuration() || 1;
        position = Math.max(0, Math.min(duration, position + (offset || 0)));
        return [ position, duration ];
    },

    drawBuffer: function () {
        if (this.params.fillParent && !this.params.scrollParent) {
            var length = this.drawer.getWidth();
        } else {
            length = Math.round(this.getDuration() * this.params.minPxPerSec * this.params.pixelRatio);
        }
        this.realPxPerSec = length / this.getDuration();

        this.drawer.drawPeaks(this.backend.getPeaks(length), length);
        this.fireEvent('redraw');
    },

    drawAsItPlays: function () {
        var my = this;
        this.realPxPerSec = this.params.minPxPerSec * this.params.pixelRatio;
        var frameTime = 1 / this.realPxPerSec;
        var prevTime = 0;
        var peaks;

        this.drawFrame = function (time) {
            if (time > prevTime && time - prevTime < frameTime) {
                return;
            }
            prevTime = time;
            var duration = my.getDuration();
            if (duration < Infinity) {
                var length = Math.round(duration * my.realPxPerSec);
                peaks = peaks || new Uint8Array(length);
            } else {
                peaks = peaks || [];
                length = peaks.length;
            }
            var index = ~~(my.backend.getPlayedPercents() * length);
            if (!peaks[index]) {
                peaks[index] = WaveSurfer.util.max(my.backend.waveform(), 128);
                my.drawer.setWidth(length);
                my.drawer.clearWave();
                my.drawer.drawWave(peaks, 128);
            }
        };

        this.backend.on('audioprocess', this.drawFrame);
    },

    /**
     * Internal method.
     */
    loadArrayBuffer: function (arraybuffer) {
        var my = this;
        this.backend.decodeArrayBuffer(arraybuffer, function (data) {
            my.loadDecodedBuffer(data);
        }, function () {
            my.fireEvent('error', 'Error decoding audiobuffer');
        });
    },

    /**
     * Directly load an externally decoded AudioBuffer.
     */
    loadDecodedBuffer: function (buffer) {
        this.empty();

        /* In case it's called externally */
        if (this.params.backend != 'WebAudioBuffer') {
            this.params.backend = 'WebAudioBuffer';
            this.createBackend();
        }
        this.backend.load(buffer);

        this.drawBuffer();
        this.fireEvent('ready');
    },

    /**
     * Loads audio data from a Blob or File object.
     *
     * @param {Blob|File} blob Audio data.
     */
    loadBlob: function (blob) {
        var my = this;
        // Create file reader
        var reader = new FileReader();
        reader.addEventListener('progress', function (e) {
            my.onProgress(e);
        });
        reader.addEventListener('load', function (e) {
            my.empty();
            my.loadArrayBuffer(e.target.result);
        });
        reader.addEventListener('error', function () {
            my.fireEvent('error', 'Error reading file');
        });
        reader.readAsArrayBuffer(blob);
    },

    /**
     * Loads audio and rerenders the waveform.
     */
    load: function (url, peaks) {
        switch (this.params.backend) {
            case 'WebAudioBuffer': return this.loadBuffer(url);
            case 'WebAudioMedia': return this.loadStream(url);
            case 'AudioElement': return this.loadAudioElement(url, peaks);
        }
    },

    /**
     * Loads audio using Web Audio buffer backend.
     */
    loadBuffer: function (url) {
        this.empty();
        // load via XHR and render all at once
        return this.downloadArrayBuffer(url, this.loadArrayBuffer.bind(this));
    },

    /**
     * Load audio stream and render its waveform as it plays.
     */
    loadStream: function (url) {
        var my = this;

        /* In case it's called externally */
        if (this.params.backend != 'WebAudioMedia') {
            this.params.backend = 'WebAudioMedia';
            this.createBackend();
        }

        this.empty();
        this.drawAsItPlays();
        this.media = this.createMedia(url);

        // iOS requires a touch to start loading audio
        this.once('user-action', function () {
            // Assume media.readyState >= media.HAVE_ENOUGH_DATA
            my.backend.load(my.media);
        });

        setTimeout(this.fireEvent.bind(this, 'ready'), 0);
    },

    loadAudioElement: function (url, peaks) {
        var my = this;

        /* In case it's called externally */
        if (this.params.backend != 'AudioElement') {
            this.params.backend = 'AudioElement';
            this.createBackend();
        }

        this.empty();
        this.media = this.createMedia(url);

        this.once('media-canplay', function () {
            my.backend.load(my.media, peaks);
            my.drawBuffer();
            my.fireEvent('ready');
        });
    },

    downloadArrayBuffer: function (url, callback) {
        var my = this;
        var ajax = WaveSurfer.util.ajax({
            url: url,
            responseType: 'arraybuffer'
        });
        ajax.on('progress', function (e) {
            my.onProgress(e);
        });
        ajax.on('success', callback);
        ajax.on('error', function (e) {
            my.fireEvent('error', 'XHR error: ' + e.target.statusText);
        });
        return ajax;
    },

    onProgress: function (e) {
        if (e.lengthComputable) {
            var percentComplete = e.loaded / e.total;
        } else {
            // Approximate progress with an asymptotic
            // function, and assume downloads in the 1-3 MB range.
            percentComplete = e.loaded / (e.loaded + 1000000);
        }
        this.fireEvent('loading', Math.round(percentComplete * 100), e.target);
    },

    bindMarks: function () {
        var my = this;
        var prevTime = 0;

        this.backend.on('play', function () {
            // Reset marker events
            Object.keys(my.markers).forEach(function (id) {
                my.markers[id].played = false;
            });
        });

        this.backend.on('audioprocess', function (time) {
            Object.keys(my.markers).forEach(function (id) {
                var marker = my.markers[id];
                if (!marker.played) {
                    if (marker.position <= time && marker.position >= prevTime) {
                        // Prevent firing the event more than once per playback
                        marker.played = true;

                        my.fireEvent('mark', marker);
                        marker.fireEvent('reached');
                    }
                }
            });
            prevTime = time;
        });
    },

    bindRegions: function () {
        var my = this;
        this.backend.on('play', function () {
            Object.keys(my.regions).forEach(function (id) {
                my.regions[id].firedIn = false;
                my.regions[id].firedOut = false;
            });
        });
        this.backend.on('audioprocess', function (time) {
            Object.keys(my.regions).forEach(function (id) {
                var region = my.regions[id];
                if (!region.firedIn && region.startPosition <= time && region.endPosition >= time) {
                    my.fireEvent('region-in', region);
                    region.fireEvent('in');
                    region.firedIn = true;
                }
                if (!region.firedOut && region.firedIn && region.endPosition < time) {
                    my.fireEvent('region-out', region);
                    region.fireEvent('out');
                    region.firedOut = true;
                }
            });
        });
    },

    /**
     * Display empty waveform.
     */
    empty: function () {
        if (this.drawFrame) {
            this.un('progress', this.drawFrame);
            this.drawFrame = null;
        }

        if (this.backend && !this.backend.isPaused()) {
            this.stop();
            this.backend.disconnectSource();
        }
        this.clearMarks();
        this.clearRegions();
        this.drawer.setWidth(0);
        this.drawer.drawPeaks({ length: this.drawer.getWidth() }, 0);
    },

    /**
     * Remove events, elements and disconnect WebAudio nodes.
     */
    destroy: function () {
        this.fireEvent('destroy');
        this.clearMarks();
        this.clearRegions();
        this.unAll();
        this.backend.destroy();
        this.drawer.destroy();
        if (this.media) {
            this.container.removeChild(this.media);
        }
    },

    updateSelectionByMark: function (markDrag, mark) {
        var selection;
        if (mark.id == this.selMark0.id) {
            selection = {
                'startPercentage': markDrag.endPercentage,
                'endPercentage': this.selMark1.percentage
            };
        } else {
            selection = {
                'startPercentage': this.selMark0.percentage,
                'endPercentage': markDrag.endPercentage
            };
        }
        this.updateSelection(selection);
    },

    updateSelection: function (selection) {
        var my = this;
        var percent0 = selection.startPercentage;
        var percent1 = selection.endPercentage;
        var color = this.params.selectionColor;
        var width = 0;
        if (this.params.selectionBorder) {
            color = this.params.selectionBorderColor;
            width = 2; // parametrize?
        }

        if (percent0 > percent1) {
            var tmpPercent = percent0;
            percent0 = percent1;
            percent1 = tmpPercent;
        }

        if (this.selMark0) {
            this.selMark0.update({
                percentage: percent0,
                position: percent0 * this.getDuration()
            });
        } else {
            this.selMark0 = this.mark({
                width: width,
                percentage: percent0,
                position: percent0 * this.getDuration(),
                color: color,
                draggable: my.params.selectionBorder
            });
        }

        if (this.selMark1) {
            this.selMark1.update({
                percentage: percent1,
                position: percent1 * this.getDuration()
            });
        } else {
            this.selMark1 = this.mark({
                width: width,
                percentage: percent1,
                position: percent1 * this.getDuration(),
                color: color,
                draggable: my.params.selectionBorder
            });
        }

        this.drawer.updateSelection(percent0, percent1);

        if (this.params.loopSelection) {
            this.backend.updateSelection(percent0, percent1);
        }
        my.fireEvent('selection-update', this.getSelection());
    },

    moveMark: function (drag, mark) {
        mark.update({
            percentage: drag.endPercentage,
            position: drag.endPercentage * this.getDuration()
        });
        this.markers[mark.id] = mark;
    },

    clearSelection: function () {
        if (this.selMark0 && this.selMark1) {
            this.drawer.clearSelection(this.selMark0, this.selMark1);

            this.selMark0.remove();
            this.selMark0 = null;

            this.selMark1.remove();
            this.selMark1 = null;

            if (this.params.loopSelection) {
                this.backend.clearSelection();
            }
            this.fireEvent('selection-update', this.getSelection());
        }
    },

    toggleLoopSelection: function () {
        this.params.loopSelection = !this.params.loopSelection;
        if (this.params.loopSelection) {
            if (this.selMark0 && this.selMark1) {
                this.updateSelection({
                    startPercentage: this.selMark0.percentage,
                    endPercentage: this.selMark1.percentage
                });
            }
        } else {
            this.backend.clearSelection();
        }
    },

    getSelection: function () {
        if (!this.selMark0 || !this.selMark1) return null;
        return {
            startPercentage: this.selMark0.percentage,
            startPosition: this.selMark0.position,
            endPercentage: this.selMark1.percentage,
            endPosition: this.selMark1.position,
            startTime: this.selMark0.getTitle(),
            endTime: this.selMark1.getTitle()
        };
    },

    enableInteraction: function () {
        this.params.interact = true;
    },

    disableInteraction: function () {
        this.params.interact = false;
    },

    toggleInteraction: function () {
        this.params.interact = !this.params.interact;
    },

    enableDragSelection: function () {
        this.params.dragSelection = true;
    },

    disableDragSelection: function () {
        this.params.dragSelection = false;
    },

    toggleDragSelection: function () {
        this.params.dragSelection = !this.params.dragSelection;
    }
};


/* Mark */
WaveSurfer.Mark = {
    defaultParams: {
        id: null,
        position: 0,
        percentage: 0,
        width: 1,
        color: '#333',
        draggable: false
    },

    init: function (options) {
        this.apply(
            WaveSurfer.util.extend({}, this.defaultParams, options)
        );
        return this;
    },

    getTitle: function () {
        return [
            ~~(this.position / 60),                   // minutes
            ('00' + ~~(this.position % 60)).slice(-2) // seconds
        ].join(':');
    },

    apply: function (options) {
        Object.keys(options).forEach(function (key) {
            if (key in this.defaultParams) {
                this[key] = options[key];
            }
        }, this);
    },

    update: function (options) {
        this.apply(options);
        this.fireEvent('update');
    },

    remove: function () {
        this.fireEvent('remove');
        this.unAll();
    }
};

/* Region */

WaveSurfer.Region = {
    defaultParams: {
        id: null,
        startPosition: 0,
        endPosition: 0,
        startPercentage: 0,
        endPercentage: 0,
        color: 'rgba(0, 0, 255, 0.2)'
    },

    init: function (options) {
        this.apply(
            WaveSurfer.util.extend({}, this.defaultParams, options)
        );
        return this;
    },

    apply: function (options) {
        Object.keys(options).forEach(function (key) {
            if (key in this.defaultParams) {
                this[key] = options[key];
            }
        }, this);
    },

    update: function (options) {
        this.apply(options);
        this.fireEvent('update');
    },

    remove: function () {
        this.fireEvent('remove');
        this.unAll();
    }
};

/* Observer */
WaveSurfer.Observer = {
    on: function (event, fn) {
        if (!this.handlers) { this.handlers = {}; }

        var handlers = this.handlers[event];
        if (!handlers) {
            handlers = this.handlers[event] = [];
        }
        handlers.push(fn);
    },

    un: function (event, fn) {
        if (!this.handlers) { return; }

        var handlers = this.handlers[event];
        if (handlers) {
            if (fn) {
                for (var i = handlers.length - 1; i >= 0; i--) {
                    if (handlers[i] == fn) {
                        handlers.splice(i, 1);
                    }
                }
            } else {
                handlers.length = 0;
            }
        }
    },

    unAll: function () {
        this.handlers = null;
    },

    once: function (event, handler) {
        var my = this;
        var fn = function () {
            handler();
            setTimeout(function () {
                my.un(event, fn);
            }, 0);
        };
        this.on(event, fn);
    },

    fireEvent: function (event) {
        if (!this.handlers) { return; }
        var handlers = this.handlers[event];
        var args = Array.prototype.slice.call(arguments, 1);
        handlers && handlers.forEach(function (fn) {
            fn.apply(null, args);
        });
    }
};

/* Common utilities */
WaveSurfer.util = {
    extend: function (dest) {
        var sources = Array.prototype.slice.call(arguments, 1);
        sources.forEach(function (source) {
            Object.keys(source).forEach(function (key) {
                dest[key] = source[key];
            });
        });
        return dest;
    },

    getId: function () {
        return 'wavesurfer_' + Math.random().toString(32).substring(2);
    },

    max: function (values, min) {
        var max = -Infinity;
        for (var i = 0, len = values.length; i < len; i++) {
            var val = values[i];
            if (min != null) {
                val = Math.abs(val - min);
            }
            if (val > max) { max = val; }
        }
        return max;
    },

    ajax: function (options) {
        var ajax = Object.create(WaveSurfer.Observer);
        var xhr = new XMLHttpRequest();
        var fired100 = false;
        xhr.open(options.method || 'GET', options.url, true);
        xhr.responseType = options.responseType;
        xhr.addEventListener('progress', function (e) {
            ajax.fireEvent('progress', e);
            if (e.lengthComputable && e.loaded == e.total) {
                fired100 = true;
            }
        });
        xhr.addEventListener('load', function (e) {
            if (!fired100) {
                ajax.fireEvent('progress', e);
            }
            ajax.fireEvent('load', e);

            if (200 == xhr.status || 206 == xhr.status) {
                ajax.fireEvent('success', xhr.response, e);
            } else {
                ajax.fireEvent('error', e);
            }
        });
        xhr.addEventListener('error', function (e) {
            ajax.fireEvent('error', e);
        });
        xhr.send();
        ajax.xhr = xhr;
        return ajax;
    },

    /**
     * @see http://underscorejs.org/#throttle
     */
    throttle: function (func, wait, options) {
        var context, args, result;
        var timeout = null;
        var previous = 0;
        options || (options = {});
        var later = function () {
            previous = options.leading === false ? 0 : Date.now();
            timeout = null;
            result = func.apply(context, args);
            context = args = null;
        };
        return function () {
            var now = Date.now();
            if (!previous && options.leading === false) previous = now;
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0) {
                clearTimeout(timeout);
                timeout = null;
                previous = now;
                result = func.apply(context, args);
                context = args = null;
            } else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(later, remaining);
            }
            return result;
        };
    }
};

WaveSurfer.util.extend(WaveSurfer, WaveSurfer.Observer);
WaveSurfer.util.extend(WaveSurfer.Mark, WaveSurfer.Observer);
WaveSurfer.util.extend(WaveSurfer.Region, WaveSurfer.Observer);

'use strict';

WaveSurfer.WebAudio = {
    scriptBufferSize: 256,
    fftSize: 128,

    getAudioContext: function () {
        if (!(window.AudioContext || window.webkitAudioContext)) {
            throw new Error(
                'wavesurfer.js: your browser doesn\'t support WebAudio'
            );
        }

        if (!WaveSurfer.WebAudio.audioContext) {
            WaveSurfer.WebAudio.audioContext = new (
                window.AudioContext || window.webkitAudioContext
            );
        }
        return WaveSurfer.WebAudio.audioContext;
    },

    init: function (params) {
        this.params = params;
        this.ac = params.audioContext || this.getAudioContext();

        this.loop = false;
        this.prevFrameTime = 0;
        this.scheduledPause = null;
        this.firedFinish = false;

        this.postInit();

        this.createVolumeNode();
        this.createScriptNode();
        this.createAnalyserNode();
        this.setPlaybackRate(this.params.audioRate);
    },

    disconnectFilters: function () {
        if (this.filters) {
            this.filters.forEach(function (filter) {
                filter && filter.disconnect();
            });
            this.filters = null;
        }
    },

    // Unpacked filters
    setFilter: function () {
        this.setFilters([].slice.call(arguments));
    },

    /**
     * @param {Array} filters Packed ilters array
     */
    setFilters: function (filters) {
        this.disconnectFilters();

        if (filters && filters.length) {
            this.filters = filters;

            // Connect each filter in turn
            filters.reduce(function (prev, curr) {
                prev.connect(curr);
                return curr;
            }, this.analyser).connect(this.gainNode);
        } else {
            this.analyser.connect(this.gainNode);
        }
    },

    createScriptNode: function () {
        var my = this;
        var bufferSize = this.scriptBufferSize;
        if (this.ac.createScriptProcessor) {
            this.scriptNode = this.ac.createScriptProcessor(bufferSize);
        } else {
            this.scriptNode = this.ac.createJavaScriptNode(bufferSize);
        }
        this.scriptNode.connect(this.ac.destination);
        this.scriptNode.onaudioprocess = function () {
            var time = my.getCurrentTime();
            if (!my.firedFinish && my.buffer && time >= my.getDuration()) {
                my.firedFinish = true;
                my.fireEvent('finish');
            }

            if (!my.isPaused()) {
                my.onPlayFrame(time);
                my.fireEvent('audioprocess', time);
            }
        };
    },

    onPlayFrame: function (time) {
        if (this.scheduledPause != null) {
            if (this.prevFrameTime >= this.scheduledPause) {
                this.pause();
            }
        }

        if (this.loop) {
            if (
                this.prevFrameTime > this.loopStart &&
                this.prevFrameTime <= this.loopEnd &&
                time > this.loopEnd
            ) {
                this.play(this.loopStart);
            }
        }

        this.prevFrameTime = time;
    },

    createAnalyserNode: function () {
        this.analyser = this.ac.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.connect(this.gainNode);
    },

    /**
     * Create the gain node needed to control the playback volume.
     */
    createVolumeNode: function () {
        // Create gain node using the AudioContext
        if (this.ac.createGain) {
            this.gainNode = this.ac.createGain();
        } else {
            this.gainNode = this.ac.createGainNode();
        }
        // Add the gain node to the graph
        this.gainNode.connect(this.ac.destination);
    },

    /**
     * Set the gain to a new value.
     *
     * @param {Number} newGain The new gain, a floating point value
     * between 0 and 1. 0 being no gain and 1 being maximum gain.
     */
    setVolume: function (newGain) {
        this.gainNode.gain.value = newGain;
    },

    /**
     * Get the current gain.
     *
     * @returns {Number} The current gain, a floating point value
     * between 0 and 1. 0 being no gain and 1 being maximum gain.
     */
    getVolume: function () {
        return this.gainNode.gain.value;
    },

    decodeArrayBuffer: function (arraybuffer, callback, errback) {
        var my = this;
        this.ac.decodeAudioData(arraybuffer, function (data) {
            my.buffer = data;
            callback(data);
        }, errback);
    },

    /**
     * @returns {Float32Array} Array of peaks.
     */
    getPeaks: function (length) {
        var buffer = this.buffer;
        var sampleSize = buffer.length / length;
        var sampleStep = ~~(sampleSize / 10) || 1;
        var channels = buffer.numberOfChannels;
        var peaks = new Float32Array(length);

        for (var c = 0; c < channels; c++) {
            var chan = buffer.getChannelData(c);
            for (var i = 0; i < length; i++) {
                var start = ~~(i * sampleSize);
                var end = ~~(start + sampleSize);
                var max = 0;
                for (var j = start; j < end; j += sampleStep) {
                    var value = chan[j];
                    if (value > max) {
                        max = value;
                    // faster than Math.abs
                    } else if (-value > max) {
                        max = -value;
                    }
                }
                if (c == 0 || max > peaks[i]) {
                    peaks[i] = max;
                }
            }
        }

        return peaks;
    },

    getPlayedPercents: function () {
        var duration = this.getDuration();
        return (this.getCurrentTime() / duration) || 0;
    },

    disconnectSource: function () {
        this.firedFinish = false;
        if (this.source) {
            this.source.disconnect();
        }
    },

    destroy: function () {
        this.pause();
        this.unAll();
        this.buffer = null;
        this.disconnectFilters();
        this.disconnectSource();
        this.gainNode.disconnect();
        this.scriptNode.disconnect();
        this.analyser.disconnect();
    },

    updateSelection: function (startPercent, endPercent) {
        var duration = this.getDuration();
        this.loop = true;
        this.loopStart = duration * startPercent;
        this.loopEnd = duration * endPercent;
    },

    clearSelection: function () {
        this.loop = false;
        this.loopStart = 0;
        this.loopEnd = 0;
    },

    /**
     * Returns the real-time waveform data.
     *
     * @return {Uint8Array} The frequency data.
     * Values range from 0 to 255.
     */
    waveform: function () {
        this.analyser.getByteTimeDomainData(this.analyserData);
        return this.analyserData;
    },


    /* Dummy methods */

    postInit: function () {},
    load: function () {},

    /**
     * Get current position in seconds.
     */
    getCurrentTime: function () {
        return 0;
    },

    /**
     * @returns {Boolean}
     */
    isPaused: function () {
        return true;
    },

    /**
     * Get duration in seconds.
     */
    getDuration: function () {
        return 0;
    },

    /**
     * Set the audio source playback rate.
     */
    setPlaybackRate: function (value) {
        this.playbackRate = value || 1;
    },

    /**
     * Plays the loaded audio region.
     *
     * @param {Number} start Start offset in seconds,
     * relative to the beginning of a clip.
     * @param {Number} end When to stop
     * relative to the beginning of a clip.
     */
    play: function (start, end) {},

    /**
     * Pauses the loaded audio.
     */
    pause: function () {}
};

WaveSurfer.util.extend(WaveSurfer.WebAudio, WaveSurfer.Observer);

WaveSurfer.WebAudioBuffer = Object.create(WaveSurfer.WebAudio);

WaveSurfer.util.extend(WaveSurfer.WebAudioBuffer, {
    postInit: function () {
        this.lastStartPosition = 0;
        this.lastPlay = this.lastPause = this.nextPause = this.ac.currentTime;
    },

    load: function (buffer) {
        this.lastStartPosition = 0;
        this.lastPlay = this.lastPause = this.nextPause = this.ac.currentTime;
        this.buffer = buffer;
        this.createSource();
    },

    createSource: function () {
        this.disconnectSource();
        this.source = this.ac.createBufferSource();
        this.source.playbackRate.value = this.playbackRate;
        this.source.buffer = this.buffer;
        this.source.connect(this.analyser);
    },

    isPaused: function () {
        return this.nextPause <= this.ac.currentTime;
    },

    getDuration: function () {
        return this.buffer.duration;
    },

    /**
     * Plays the loaded audio region.
     *
     * @param {Number} start Start offset in seconds,
     * relative to the beginning of a clip.
     * @param {Number} end When to stop
     * relative to the beginning of a clip.
     */
    play: function (start, end) {
        // need to re-create source on each playback
        this.createSource();

        if (start == null) {
            start = this.getCurrentTime();
        }
        if (end == null) {
            if (this.scheduledPause != null) {
                end = this.scheduledPause;
            } else {
                end = this.getDuration();
            }
        }

        this.lastPlay = this.ac.currentTime;
        this.lastStartPosition = start;
        this.lastPause = this.nextPause = this.ac.currentTime + (end - start);
        this.prevFrameTime = -1; // break free from a loop

        if (this.source.start) {
            this.source.start(0, start, end - start);
        } else {
            this.source.noteGrainOn(0, start, end - start);
        }

        this.fireEvent('play');
    },

    /**
     * Pauses the loaded audio.
     */
    pause: function () {
        this.scheduledPause = null;
        this.lastPause = this.nextPause = this.ac.currentTime;

        if (this.source) {
            if (this.source.stop) {
                this.source.stop(0);
            } else {
                this.source.noteOff(0);
            }
        }

        this.fireEvent('pause');
    },

    getCurrentTime: function () {
        if (this.isPaused()) {
            return this.lastStartPosition + (this.lastPause - this.lastPlay) * this.playbackRate;
        } else {
            return this.lastStartPosition + (this.ac.currentTime - this.lastPlay) * this.playbackRate;
        }
    },

    /**
     * Set the audio source playback rate.
     */
    setPlaybackRate: function (value) {
        this.playbackRate = value || 1;
        if (this.source) {
            this.source.playbackRate.value = this.playbackRate;
        }
    }
});

WaveSurfer.Drawer = {
    init: function (container, params) {
        this.container = container;
        this.params = params;

        this.width = 0;
        this.height = params.height * this.params.pixelRatio;
        this.containerWidth = this.container.clientWidth;

        this.lastPos = 0;

        this.createWrapper();
        this.createElements();
    },

    createWrapper: function () {
        this.wrapper = this.container.appendChild(
            document.createElement('wave')
        );
        this.style(this.wrapper, {
            display: 'block',
            position: 'relative',
            userSelect: 'none',
            webkitUserSelect: 'none',
            height: this.params.height + 'px'
        });

        if (this.params.fillParent || this.params.scrollParent) {
            this.style(this.wrapper, {
                width: '100%',
                overflowX: this.params.hideScrollbar ? 'hidden' : 'auto',
                overflowY: 'hidden'
            });
        }

        this.setupWrapperEvents();
    },

    handleEvent: function (e) {
        e.preventDefault();
        var bbox = this.wrapper.getBoundingClientRect();
        return ((e.clientX - bbox.left + this.wrapper.scrollLeft) / this.scrollWidth) || 0;
    },

    setupWrapperEvents: function () {
        var my = this;
        var drag = {};

        this.wrapper.addEventListener('mousedown', function (e) {
            var scrollbarHeight = my.wrapper.offsetHeight - my.wrapper.clientHeight;
            if (scrollbarHeight != 0) {
                // scrollbar is visible.  Check if click was on it
                var bbox = my.wrapper.getBoundingClientRect();
                if (e.clientY >= bbox.bottom - scrollbarHeight) {
                    // ignore mousedown as it was on the scrollbar
                    return;
                }
            }

            if (my.params.interact) {
                my.fireEvent('mousedown', my.handleEvent(e), e);
            }
            drag.startPercentage = my.handleEvent(e);
        });

        this.wrapper.addEventListener('mouseup', function (e) {
            if (my.params.interact) {
                my.fireEvent('mouseup', e);
            }
        });

        this.wrapper.addEventListener('dblclick', function(e) {
            if (my.params.interact || my.params.dragSelection) {
                if (
                    e.target.tagName.toLowerCase() == 'handler' &&
                        !e.target.classList.contains('selection-wavesurfer-handler')
                ) {
                    my.fireEvent('mark-dblclick', e.target.parentNode.id);
                }
                else{
                    my.fireEvent('drag-clear');
                }
            }
        });

        var onMouseUp = function (e) {
            drag.startPercentage = drag.endPercentage = null;
        };
        document.addEventListener('mouseup', onMouseUp);
        this.on('destroy', function () {
            document.removeEventListener('mouseup', onMouseUp);
        });

        this.wrapper.addEventListener('mousemove', WaveSurfer.util.throttle(function (e) {
            e.stopPropagation();
            if (drag.startPercentage != null) {
                drag.endPercentage = my.handleEvent(e);
                if (my.params.interact && my.params.dragSelection) {
                    my.fireEvent('drag', drag);
                }
            }
        }, 30));
    },

    drawPeaks: function (peaks, length) {
        this.resetScroll();
        this.setWidth(length);
        if (this.params.normalize) {
            var max = WaveSurfer.util.max(peaks);
        } else {
            max = 1;
        }
        this.drawWave(peaks, max);
    },

    style: function (el, styles) {
        Object.keys(styles).forEach(function (prop) {
            if (el.style[prop] != styles[prop]) {
                el.style[prop] = styles[prop];
            }
        });
        return el;
    },

    resetScroll: function () {
        this.wrapper.scrollLeft = 0;
    },

    recenter: function (percent) {
        var position = this.scrollWidth * percent;
        this.recenterOnPosition(position, true);
    },

    recenterOnPosition: function (position, immediate) {
        var scrollLeft = this.wrapper.scrollLeft;
        var half = ~~(this.containerWidth / 2);
        var target = position - half;
        var offset = target - scrollLeft;

        // if the cursor is currently visible...
        if (!immediate && offset >= -half && offset < half) {
            // we'll limit the "re-center" rate.
            var rate = 5;
            offset = Math.max(-rate, Math.min(rate, offset));
            target = scrollLeft + offset;
        }

        if (offset != 0) {
            this.wrapper.scrollLeft = target;
        }
    },

    getWidth: function () {
        return Math.round(this.containerWidth * this.params.pixelRatio);
    },

    setWidth: function (width) {
        if (width == this.width) { return; }

        this.width = width;
        this.scrollWidth = ~~(this.width / this.params.pixelRatio);
        this.containerWidth = this.container.clientWidth;

        if (this.params.fillParent || this.params.scrollParent) {
            this.style(this.wrapper, {
                width: ''
            });
        } else {
            this.style(this.wrapper, {
                width: this.scrollWidth + 'px'
            });
        }

        this.updateWidth();
    },

    progress: function (progress) {
        var minPxDelta = 1 / this.params.pixelRatio;
        var pos = Math.round(progress * this.width) * minPxDelta;

        if (pos < this.lastPos || pos - this.lastPos >= minPxDelta) {
            this.lastPos = pos;

            if (this.params.scrollParent) {
                var newPos = ~~(this.scrollWidth * progress);
                this.recenterOnPosition(newPos);
            }

            this.updateProgress(progress);
        }
    },

    destroy: function () {
        this.unAll();
        this.container.removeChild(this.wrapper);
        this.wrapper = null;
    },

    updateSelection: function (startPercent, endPercent) {
        this.startPercent = startPercent;
        this.endPercent = endPercent;

        this.drawSelection();
    },

    clearSelection: function (mark0, mark1) {
        this.startPercent = null;
        this.endPercent = null;
        this.eraseSelection();
        this.eraseSelectionMarks(mark0, mark1);
    },


    /* Renderer-specific methods */
    createElements: function () {},

    updateWidth: function () {},

    drawWave: function (peaks, max) {},

    clearWave: function () {},

    updateProgress: function (position) {},

    addMark: function (mark) {},

    removeMark: function (mark) {},

    updateMark: function (mark) {},

    addRegion: function (region) {},

    removeRegion: function (region) {},

    updateRegion: function (region) {},

    drawSelection: function () {},

    eraseSelection: function () {},

    eraseSelectionMarks: function (mark0, mark1) {}
};

WaveSurfer.util.extend(WaveSurfer.Drawer, WaveSurfer.Observer);

WaveSurfer.Drawer.Canvas = Object.create(WaveSurfer.Drawer);

WaveSurfer.util.extend(WaveSurfer.Drawer.Canvas, {
    createElements: function () {
        var waveCanvas = this.wrapper.appendChild(
            this.style(document.createElement('canvas'), {
                position: 'absolute',
                zIndex: 1
            })
        );

        this.progressWave = this.wrapper.appendChild(
            this.style(document.createElement('wave'), {
                position: 'absolute',
                zIndex: 2,
                overflow: 'hidden',
                width: '0',
                height: this.params.height + 'px',
                borderRight: [
                    this.params.cursorWidth + 'px',
                    'solid',
                    this.params.cursorColor
                ].join(' ')
            })
        );

        var progressCanvas = this.progressWave.appendChild(
            document.createElement('canvas')
        );

        var selectionZIndex = 0;

        if (this.params.selectionForeground) {
            selectionZIndex = 3;
        }

        var selectionCanvas = this.wrapper.appendChild(
            this.style(document.createElement('canvas'), {
                position: 'absolute',
                zIndex: selectionZIndex
            })
        );

        this.waveCc = waveCanvas.getContext('2d');
        this.progressCc = progressCanvas.getContext('2d');
        this.selectionCc = selectionCanvas.getContext('2d');
    },

    updateWidth: function () {
        var width = Math.round(this.width / this.params.pixelRatio);
        [
            this.waveCc,
            this.progressCc,
            this.selectionCc
        ].forEach(function (cc) {
            cc.canvas.width = this.width;
            cc.canvas.height = this.height;
            this.style(cc.canvas, { width: width + 'px'});
        }, this);

        this.clearWave();
    },

    clearWave: function () {
        this.waveCc.clearRect(0, 0, this.width, this.height);
        this.progressCc.clearRect(0, 0, this.width, this.height);
    },

    drawWave: function (peaks, max) {
        // A half-pixel offset makes lines crisp
        var $ = 0.5 / this.params.pixelRatio;
        this.waveCc.fillStyle = this.params.waveColor;
        this.progressCc.fillStyle = this.params.progressColor;

        var halfH = this.height / 2;
        var coef = halfH / max;
        var scale = 1;
        if (this.params.fillParent && this.width > peaks.length) {
            scale = this.width / peaks.length;
        }
        var length = peaks.length;

        this.waveCc.beginPath();
        this.waveCc.moveTo($, halfH);
        this.progressCc.beginPath();
        this.progressCc.moveTo($, halfH);
        for (var i = 0; i < length; i++) {
            var h = Math.round(peaks[i] * coef);
            this.waveCc.lineTo(i * scale + $, halfH + h);
            this.progressCc.lineTo(i * scale + $, halfH + h);
        }
        this.waveCc.lineTo(this.width + $, halfH);
        this.progressCc.lineTo(this.width + $, halfH);

        this.waveCc.moveTo($, halfH);
        this.progressCc.moveTo($, halfH);
        for (var i = 0; i < length; i++) {
            var h = Math.round(peaks[i] * coef);
            this.waveCc.lineTo(i * scale + $, halfH - h);
            this.progressCc.lineTo(i * scale + $, halfH - h);
        }

        this.waveCc.lineTo(this.width + $, halfH);
        this.waveCc.fill();
        this.progressCc.lineTo(this.width + $, halfH);
        this.progressCc.fill();

        // Always draw a median line
        this.waveCc.fillRect(0, halfH - $, this.width, $);
    },

    updateProgress: function (progress) {
        var pos = Math.round(
            this.width * progress
        ) / this.params.pixelRatio;
        this.style(this.progressWave, { width: pos + 'px' });
    },

    addMark: function (mark) {
        var my = this;
        var markEl = document.createElement('mark');
        markEl.id = mark.id;
        if (mark.type && mark.type === 'selMark') {
            markEl.className = 'selection-mark';
        }
        this.wrapper.appendChild(markEl);
        var handler;

        if (mark.draggable) {
            handler = document.createElement('handler');
            handler.id = mark.id + '-handler';
            handler.className = mark.type === 'selMark' ?
                'selection-wavesurfer-handler' : 'wavesurfer-handler';
            markEl.appendChild(handler);
        }

        markEl.addEventListener('mouseover', function (e) {
            my.fireEvent('mark-over', mark, e);
        });
        markEl.addEventListener('mouseleave', function (e) {
            my.fireEvent('mark-leave', mark, e);
        });
        markEl.addEventListener('click', function (e) {
            my.fireEvent('mark-click', mark, e);
        });

        mark.draggable && (function () {
            var drag = {};

            var onMouseUp = function (e) {
                e.stopPropagation();
                drag.startPercentage = drag.endPercentage = null;
            };
            document.addEventListener('mouseup', onMouseUp);
            my.on('destroy', function () {
                document.removeEventListener('mouseup', onMouseUp);
            });

            handler.addEventListener('mousedown', function (e) {
                e.stopPropagation();
                drag.startPercentage = my.handleEvent(e);
            });

            my.wrapper.addEventListener('mousemove', WaveSurfer.util.throttle(function (e) {
                e.stopPropagation();
                if (drag.startPercentage != null) {
                    drag.endPercentage = my.handleEvent(e);
                    my.fireEvent('drag-mark', drag, mark);
                }
            }, 30));
        }());

        this.updateMark(mark);

        if (mark.draggable) {
            this.style(handler, {
                position: 'absolute',
                cursor: 'col-resize',
                width: '12px',
                height: '15px'
            });
            this.style(handler, {
                left: handler.offsetWidth / 2 * -1 + 'px',
                top: markEl.offsetHeight / 2 - handler.offsetHeight / 2 + 'px',
                backgroundColor: mark.color
            });
        }
    },

    updateMark: function (mark) {
        var markEl = document.getElementById(mark.id);
        markEl.title = mark.getTitle();
        this.style(markEl, {
            height: '100%',
            position: 'absolute',
            zIndex: 4,
            width: mark.width + 'px',
            left: Math.max(0, Math.round(
                mark.percentage * this.scrollWidth  - mark.width / 2
            )) + 'px',
            backgroundColor: mark.color
        });
    },

    removeMark: function (mark) {
        var markEl = document.getElementById(mark.id);
        if (markEl) {
            this.wrapper.removeChild(markEl);
        }
    },

    addRegion: function (region) {
        var my = this;
        var regionEl = document.createElement('region');
        regionEl.id = region.id;
        this.wrapper.appendChild(regionEl);

        regionEl.addEventListener('mouseover', function (e) {
            my.fireEvent('region-over', region, e);
        });
        regionEl.addEventListener('mouseleave', function (e) {
            my.fireEvent('region-leave', region, e);
        });
        regionEl.addEventListener('click', function (e) {
            my.fireEvent('region-click', region, e);
        });

        this.updateRegion(region);
    },

    updateRegion: function (region) {
        var regionEl = document.getElementById(region.id);
        var left = Math.max(0, Math.round(
            region.startPercentage * this.scrollWidth));
        var width = Math.max(0, Math.round(
            region.endPercentage * this.scrollWidth)) - left;

        this.style(regionEl, {
            height: '100%',
            position: 'absolute',
            zIndex: 4,
            left: left + 'px',
            top: '0px',
            width: width + 'px',
            backgroundColor: region.color
        });
    },

    removeRegion: function (region) {
        var regionEl = document.getElementById(region.id);
        if (regionEl) {
            this.wrapper.removeChild(regionEl);
        }
    },

    drawSelection: function () {
        this.eraseSelection();

        this.selectionCc.fillStyle = this.params.selectionColor;
        var x = this.startPercent * this.width;
        var width = this.endPercent * this.width - x;

        this.selectionCc.fillRect(x, 0, width, this.height);
    },

    eraseSelection: function () {
        this.selectionCc.clearRect(0, 0, this.width, this.height);
    },

    eraseSelectionMarks: function (mark0, mark1) {
        this.removeMark(mark0);
        this.removeMark(mark1);
    }
});


Template.Waveform.rendered = function(){

var apiKey = '9e9af1b22be4324cbd46c859038df274';


  //$('a.sc-player').scPlayer();
  console.log(this.data);
  var wavesurfer = Object.create(WaveSurfer);

                  //var wavesurfer = Object.create(WaveSurfer2edsad);

                wavesurfer.init({
                    container: document.querySelector('#sid-'+this.data._id),
                    waveColor: '#3333',
                    //audioContext: audioCtx,
                    //fillParent: 'false',
                    //minPxPerSec: 100,
                    //dragSelection: false,
                    cursorColor: "#000",
                    cursorWidth: 1,
                    height: 48,
                    scrollParent: false,
                    progressColor: 'red'
                });

    /* Progress bar */
    var progress_id = '#progress-bar-'+this.data._id;
    (function () {
        var progressDiv = document.querySelector(progress_id);
        var progressBar = progressDiv.querySelector('.progress-bar');

        var showProgress = function (percent) {
            progressDiv.style.display = 'block';
            progressBar.style.width = percent + '%';
        };

        var hideProgress = function () {
            progressDiv.style.display = 'none';
        };

        wavesurfer.on('loading', showProgress);
        wavesurfer.on('ready', hideProgress);
        wavesurfer.on('destroy', hideProgress);
        wavesurfer.on('error', hideProgress);


    }());


  var debug = true,
      useSandBox = false,
      $doc = $(document),
      log = function(args) {
        try {
          if(debug && window.console && window.console.log){
            window.console.log.apply(window.console, arguments);
          }
        } catch (e) {
          // no console available
        }
      },
      domain = useSandBox ? 'sandbox-soundcloud.com' : 'soundcloud.com',
      secureDocument = (document.location.protocol === 'https:'),
      // convert a SoundCloud resource URL to an API URL
      scApiUrl = function(url, apiKey) {
        var resolver = ( secureDocument || (/^https/i).test(url) ? 'https' : 'http') + '://api.' + domain + '/resolve?url=',
            params = 'format=json&consumer_key=' + apiKey +'&callback=?';

        // force the secure url in the secure environment
        if( secureDocument ) {
          url = url.replace(/^http:/, 'https:');
        }

        // check if it's already a resolved api url
        if ( (/api\./).test(url) ) {
          return url + '?' + params;
        } else {
          return resolver + url + '&' + params;
        }
      };



        wavesurfer.load(scApiUrl(this.data.StreamURL, apiKey));
        TracksArray.push({'track_id': this.data._id, 'wavesurfer': wavesurfer});
        var theID = this.data._id;
        wavesurfer.on('ready', function(){
            // Set the regions from database...
            var wf = Waveform.find({"_id": theID });
            wf.forEach(function(w) {
                if(w.MainRegionStart && w.MainRegionEnd) {
                    var reg = wavesurfer.region(
                      {'id': "Main-"+theID, 
                      'startPosition': w.MainRegionStart, 
                      'endPosition': w.MainRegionEnd, 
                      'color': "rgba(0, 0, 255, 0.2)"
                    });
                    if (reg) reg.on('out', function (){
                        console.log("Entered region: ");
                        //wavesurfer.stop();
                        playNext();
                    });

                }

            });

        });


      //Setup click handlers for buttons
      //This is not the best since it will execute for each waveform, when its only needed to run once all waveforms are inserted in DOM. Put inside <waveforms.rendered> template!
      $("body").on("click", ".play-item-"+this.data._id, function() {
        var item = $(this).attr("data-value");
        var wf = Waveform.find({
          //"_id": item
        });
        wf.forEach(function(w) {
            if(w._id === item) {
                console.log("Gonna play: " + w.StreamURL + " - is Active: "+ w.isActive);
                // reactive programming. meteor will trigger a change event in database which will cause the music to play if isActive is true...
                Waveform.update({_id: item}, {$set: {isActive: true}}); 
                //var result = $.grep(TracksArray, function(e){ return e.track_id == item; });
                //console.log(result[0].wavesurfer);
                //wavesurfer.play();
            } else {if (w.isActive  == true) Waveform.update({_id: w._id}, {$set: {isActive: false}});}

        }); 
      });
      $("body").on("click", ".stop-item-"+this.data._id, function() {
        var item = $(this).attr("data-value");
        var wf = Waveform.find({
          "_id": item
        });
        wf.forEach(function(w) {
          console.log("Gonna stop: " + w.StreamURL);
          //Reactive programming... changing isActive will stop music playing. 
          Waveform.update({_id: item}, {$set: {isActive: false}}); 
        }); 
      });
      $("body").on("click", ".delete-item-"+this.data._id, function() {
        var item = $(this).attr("data-value");
        var wf = Waveform.find({
          "_id": item
        });
        wf.forEach(function(w) {
          console.log("Gonna delete: " + w.StreamURL);
          wavesurfer.empty();
          Waveform.remove({'_id': item});
        }); 
      });
      $("body").on("click", ".next-item-"+this.data._id, function() {
            var item = $(this).attr("data-value");
            updateRegion(item);
      });

}



Template.insertWaveForm.events({
    'click [name=search-sc]': function(event, template) {
      var apiKey = '9e9af1b22be4324cbd46c859038df274';
      SC.initialize({
        client_id: apiKey
      });



        var bestTimes = "";
        _.each(template.findAll("[name=cfTimes]"), function(textbox) {
            bestTimes = textbox.value;
            SC.get("/tracks", { q: textbox.value.trim(), limit: 10}, function (tracks) {

              //var track = tracks[0];
              //alert(track.stream_url);
              //SC.oEmbed(track.uri, document.getElementById("track"));
              tracks.forEach(function(track) {
                var $newdiv1 = $( "<a href='"+ track.stream_url + "' id='track'>"+ track.title +"<br></a>" );
                $newdiv1.click(function (event) {
                  event.preventDefault();
                  //doSetupAudio(track);
                  $(template.find('[data-schema-key=StreamURL]')).val(track.stream_url);
                });

                $( "#loadTracks" ).append( $newdiv1 );
              });

        
            });//SC.get...
        });

        
    },
    'reset form': function(event, template) {
        $(template.find('[data-schema-key=StreamURL]')).val("");
    }
});
}
