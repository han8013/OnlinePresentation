function Draw(transactionSystem, div, controlPanel) {
    var self = this;
    this.moduleName = 'draw';    //enroll module name in transaction system
    var canvas = $('<canvas id="draw-canvas" ></canvas>');
    var drawList = [];           //record all the draw history in this class
    var currentIndex = -1;
    self.isNotIncremental = false;
    var ignoreTransaction = {};  //Instructor ignore the draw transaction that himself made
    var fabricCanvas = null;     //fabric canvas from fabricjs lib
    var pen = null,      //init all the button
        eraser = null,
        clear = null,
        colorPicker = null,
        drawingLineWidthEl = null,
        drawingLineWidthDisplay = null;

    var scale = 1;      //use when resize
    var lastHeight = 0;

    div.append(canvas);
    div.attr('id', 'canvas-div');

    this.presetMethod = function () {           //setup the update method before transaction get all the old transaction for reconnect
        if (transactionSystem.privilege.indexOf("admin") != -1) canvas = new fabric.Canvas('draw-canvas', {isDrawingMode: true});       //admin get the right for draw on the screen
        else canvas = new fabric.Canvas('draw-canvas');             //use fabric js canvas
        div.find('.canvas-container').css('position', 'absolute');  //make the all the canvas and div for the fabric js jit the outer div
        div.find('.canvas-container').css('height', '100%');
        div.find('.canvas-container').css('width', '100%');
        div.find('canvas').css('position', 'absolute');
        div.find('canvas').css('height', '100%');
        div.find('canvas').css('width', '100%');
    };

    /**
     * init after transaction system
     */
    this.init = function () {
        pen = controlPanel.find('#pencil-box'),      //init all the button
            eraser = controlPanel.find('#eraser-box'),
            clear = controlPanel.find('#clear-box'),
            colorPicker = controlPanel.find('#draw-color-picker'),
            drawingLineWidthEl = controlPanel.find('drawing-line-width'),
            drawingLineWidthDisplay = controlPanel.find('drawing-line-width-display');
        fabric.Object.prototype.transparentCorners = false;     //fabricjs setting
        canvas.setHeight(div.height());
        canvas.isDrawingMode = false;
        canvas.freeDrawingBrush.color = colorPicker.val();
        canvas.freeDrawingBrush.width = 7;
        drawingLineWidthDisplay.val(7);
        canvas.setWidth(div.width());
        lastHeight = div.height();
        if (transactionSystem.privilege.indexOf("admin") != -1) {       //admin will get right for send new draw transaction and attach UI handler
            newStrokeListener();
            attachUIHandler();
            document.addEventListener(events.slidesChange.type, function () {       //when slidesChange clear all the content on the canvas
                drawList = [];
                currentIndex = -1;
                canvas.clear();
                self.newStroke(JSON.stringify(canvas));
            });
        } else {
            controlPanel.hide();            //student hide the control panel
        }
        document.addEventListener(events.viewSizeChange.type, function () {     //when the view size change
            resize(lastHeight, true);
        });
    };

    function newStrokeListener() {
        canvas.on('object:added', function () {            //add handler to event add obj
            self.newStroke(JSON.stringify(canvas));
        });
    }

    /**
     * resize all the draw content
     * @param originHeight
     * @param changeCanvas indicate resize from user resize or new transaction
     */
    function resize(originHeight, changeCanvas) {
        scaleFactor = div.height() / originHeight;

        if (changeCanvas) {
            canvas.setHeight(div.height());
            canvas.setWidth(div.width());
        }

        var objects = canvas.getObjects();
        for (var i in objects) {
            var scaleX = objects[i].scaleX;
            var scaleY = objects[i].scaleY;
            var left = objects[i].left;
            var top = objects[i].top;

            var tempScaleX = scaleX * scaleFactor;
            var tempScaleY = scaleY * scaleFactor;
            var tempLeft = left * scaleFactor;
            var tempTop = top * scaleFactor;

            objects[i].scaleX = tempScaleX;
            objects[i].scaleY = tempScaleY;
            objects[i].left = tempLeft;
            objects[i].top = tempTop;

            objects[i].setCoords();
        }
        lastHeight = div.height();
        canvas.renderAll();
    }

    /**
     * attach all UI Handler after all the UI init
     */
    var attachUIHandler = function () {
        /**
         *change the line width
         */
        drawingLineWidthEl.onchange = function () {
            canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
            drawingLineWidthDisplay.val(this.value);
        };
        /**
         * change color when value of color picker change
         */
        colorPicker.change(function () {
            canvas.freeDrawingBrush.color = colorPicker.val();
        });
        /**
         * clear all content on the canvas
         */
        clear.click(function () {
            canvas.off();
            canvas.clear();
            self.newStroke(JSON.stringify(canvas));
            newStrokeListener();
        });

        /**
         * click to erase selected object
         */
        eraser.click(function () {
            canvas.off();
            canvas.isDrawingMode = false;
            canvas.on('object:selected', function () {
                canvas.getActiveObject().remove();
                self.newStroke(JSON.stringify(canvas));
            })
        });

        /**
         * change to draw mode
         */
        pen.click(function () {
            canvas.off();
            canvas.isDrawingMode = true;
            newStrokeListener();
        });
    };

    /**
     * send the transaction to all the students
     * @param stroke a json obj contain all the obj in the canvas
     */
    this.newStroke = function (stroke) {
        var id = Math.random();
        ignoreTransaction[id] = true;
        transactionSystem.newTransaction(self.moduleName, {
            type: 'stroke',
            id: id
        }, {stroke: stroke, originHeight: lastHeight}).then(function (result) {
            currentIndex++;
            drawList.push(stroke);
            canvas.off();
            canvas.clear();
            canvas.loadFromJSON(stroke);
            canvas.renderAll();
            newStrokeListener();
        }).catch(function (err) {
            console.error('fail to new transaction');
            console.error(err);
            delete ignoreTransaction[id];
        });
    };

    /**
     * get draw transaction from instructor and update to canvas
     * @param index
     * @param description
     * @param createdBy
     * @param createdAt
     * @param payload
     */
    this.update = function (index, description, createdBy, createdAt, payload) {
        if (ignoreTransaction[description.id]) {
            delete ignoreTransaction[description.id];
            return;
        }
        drawList.push(payload.stroke);
        canvas.clear();
        canvas.loadFromJSON(payload.stroke);
        canvas.renderAll();
        resize(payload.originHeight, false);
        canvas.selection = false;
        canvas.forEachObject(function (o) {
            o.selectable = false;
        });
    };

    /**
     * reset all the init varible
     */
    this.reset = function () {
        ignoreTransaction = {};
        drawList = [];

    };

}