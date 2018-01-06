function goBack() {
    window.history.back();
}
(function () {

    var reGenerateView = (slides) => {
        var slidesContainer = $('.slides-workarea');
        slidesContainer.find('.tab-body').remove();
        var tabsContainer = slidesContainer.find('.tabs');
        tabsContainer.find('.tab').remove();
        slides.forEach((slide, i) => {
            if (!Array.isArray(slide.pages)) {
                console.error('adnormal format slide: ');
                console.error(slide);
                return;
            }
            var tabID = Math.floor(Math.random() * 30);
            var tabBody = $('<div id="tab-' + tabID + '" class="tab-body"></div>');
            var slideDiv = $('<div class="list-group"></div>');
            if (i == 0) tabBody.addClass('active');
            else tabBody.css('display', 'none');
            var tab = $('<li class="tab"><a href="#tab-' + tabID + '" tab-id="tab-' + tabID + '">' + slide.name + '<i class="material-icons" onclick="deleteSlide(this)">clear</i></a></li>');
            slide.pages.forEach((item) => {
                generateItem(item.id, item.name, slideDiv);
            });
            Sortable.create(slideDiv[0], {
                handle: '.move-file',
                animation: 150
            });
            tabBody.append(slideDiv);
            slidesContainer.append(tabBody);
            tabsContainer.append(tab);
        });
        if (!slidesContainer.find('.tab-body')[0]) return;
        var firstTabID = slidesContainer.find('.tab-body')[0].id;
        tabsContainer.tabs('select_tab', firstTabID);
    };

    var generateItem = (id, name, append) => {
        var newItem = $('.item-prototype').find('.list-group-item').clone();
        newItem.attr('data-id', id);
        newItem.find('.item-name').html(name);
        newItem.find('.badge.removal').click(() => {
            newItem.remove();
        });
        append.append(newItem);
    };

    var getList = (parent) => { // parent: slides-workarea
        var result = [];
        var links = parent.find('.tabs').find('a');
        parent.find('.list-group').each((i, list) => {
            var slideObj = {};
            slideObj.name = links[i].firstChild.nodeValue;
            slideObj.pages = [];
            var slide = slideObj.pages;
            $(list).find('.list-group-item').each((j, item) => {
                slide.push({
                    id: $(item).attr('data-id'),
                    name: $(item).find('.item-name').html(),
                    url: "https://recilive.stream/get_resource?id=" + ($(item).attr('data-id'))
                });
            });
            result.push(slideObj);
        });
        return result;
    };

    function goBack() {
        window.history.back();
    }

    var showUploadWindow = (fileDiv) => {
        var uploadDialog;
        var p = new Promise((resolve, reject) => {
            uploadDialog = vex.dialog.open({
                message: 'choose the file you want to upload:',
                input: [
                    '<input name="ffdsf" type="file" value=""/>',
                ].join(''),
                buttons: [{
                    text: 'Upload',
                    type: 'button',
                    className: 'vex-dialog-button-primary',
                    click: function (data) {
                        this.form.getElementsByClassName('vex-first')[0].disabled = true;
                        this.form.getElementsByClassName('vex-first')[0].firstChild.data="UPLOADING";
                        var request = {
                            type: 'POST',
                            url: '/add_resources',
                            data: new FormData(this.form),
                            contentType: false,
                            processData: false,
                        };
                        $.ajax(request).then((data) => {
                            if (typeof data == 'string') data = JSON.stringify(data);
                            resolve({
                                files: data.files,
                            });
                        }).catch((err) => {
                            reject(err);
                            this.form.getElementsByClassName('vex-first')[0].disabled = false;
                            this.form.getElementsByClassName('vex-first')[0].firstChild.data="Try Again";
                        });
                    }
                }, {
                    text: 'Cancel',
                    type: 'button',
                    className: 'vex-dialog-button-secondary',
                    click: function (data) {
                        reject(data);
                        this.close();
                    }
                }],
                callback: function (data) {
                }
            });
        });

        p.then((filesInfo) => {
            if (filesInfo.files.length) {
                filesInfo.files.forEach((file) => {
                    generateItem(file.id, file.name, fileDiv);
                });
            }
            vex.close(uploadDialog);
            console.log('file upload done');
        }).catch((err) => {
            console.error('file upload failed');
            console.error(err);
        });

        return p;
    };

    window.showResourcesEdit = (recitationID) => {
        var resourcesModal = $('.resources-modal');
        resourcesModal.modal('open');
        $.ajax({
            type: 'GET',
            url: '/ajax/get-recitation-resource?recitationID=' + encodeURIComponent(recitationID),
            dataType: "json"
        }).then((resources) => {
            if (!(Object.keys(resources).length != 0)) {
                resources = {resources: [{content: []}]};
            }
            reGenerateView(resources.resources[0].content);
            console.log('resources load successful');
        }).catch((err) => {
            console.error('unable to load resources');
            console.error(err);
        });
        var uploadButton = resourcesModal.find('.upload-button');
        uploadButton.off('click');
        uploadButton.click(() => {
            var focusedIndex = 0;
            resourcesModal.find('.tabs').find('a').each((i, elem) => {
                if ($(elem).hasClass('active')) {
                    focusedIndex = i;
                }
            });
            var focusedElem = $(resourcesModal.find('.tab-body')[focusedIndex]).children('div');
            showUploadWindow(focusedElem);
        });
        var submitButton = resourcesModal.find('.submit-button');
        submitButton.off('click');
        submitButton.click(() => {
            var thisSlide = {
                name: 'test slide',
                pages: []
            };
            var slideContent = getList(resourcesModal.find('.slides-workarea'));
            var resourcesContainer = {
                resources: [{
                    type: "slide",
                    content: slideContent
                }]
            };
            $.ajax({
                type: 'POST',
                url: '/ajax/set-recitation-resource?recitationID=' + encodeURIComponent(recitationID),
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(resourcesContainer),
                dataType: "json"
            }).then((data) => {
                resourcesModal.modal('close');
                console.log('resources push successful');
            }).catch((err) => {
                console.warn('resources push failed');
                console.warn(err);
            });
        });
    };
})();