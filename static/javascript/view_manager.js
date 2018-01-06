//
/**
 * view manager control the ratio of all view div
 * @param stageDiv
 * @constructor
 */
function ViewManager(stageDiv) {
    var ratio = 0.5625; // default to 16:9
    var views = [];

    this.init = function() {
        new ResizeSensor(stageDiv, parentChangeHandler);
    };

    function parentChangeHandler(){
        resizeElem($( $.map(views, a => [...a]) ), ratio, stageDiv);
        document.dispatchEvent(events.viewSizeChange());
    }

    function resizeElem(elem, ratio, parent){
        var h = parent.innerHeight();
        var w = parent.innerWidth();
        if(h/w < ratio){ // wider
            elem.css('top', '0px');
            elem.css('bottom', '0px');
            var marginW = (w-h/ratio)/2.0;
            elem.css('left', marginW);
            elem.css('right', marginW);
        }else{ // taller
            elem.css('left', '0px');
            elem.css('right', '0px');
            var marginH = (h-w*ratio)/2.0;
            elem.css('top', marginH);
            elem.css('bottom', marginH);
        }
    }

    this.getCanvas = function(){
        var elem = $('<canvas></canvas>')
            .css('position','absolute')
            .css('border-style', 'solid')
            .appendTo(stageDiv);
        views.push(elem);
        parentChangeHandler();
        return elem;
    };

    this.getDiv = function(){
        var elem = $('<div></div>')
            .css('position','absolute')
            .css('border-style', 'solid')
            .appendTo(stageDiv);
        views.push(elem);
        parentChangeHandler();
        return elem;
    };

    this.removeElement = function (elem) {
        for(var i=0; i<views.length; i++){
            if(elem.is(views[i])){
                views.splice(i, 1);
                i--;
            }
        }
    };

    this.changeRatio = function(newRatio){
        ratio = newRatio;
        parentChangeHandler();
    };


}


