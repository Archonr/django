/**
 * Created by evgeniy on 21.12.16.
 */
// *** Classes ***
var DEBUG = true;

// GENERAL class
var General = new function () {
    var self = this;

    self.domain = "lucky-labs.com";

    self.projects = {};
    self.platforms = {};
    self.jobs = {};
    self.users = {};
    self.params = {};

    self.toSave = {
        'projects': {
            'changed':[],
            'removed':[]
        },
        'platforms': {
            'changed':[],
            'removed':[]
        },
        'jobs': {
            'changed':[],
            'removed':[]
        },
        'users': {
            'changed':[],
            'removed':[]
        },
        'params': {
            'changed': [],
            'removed': []
        }
    };

    self.setPages = function() {
        var pages = [];
        if (typeof ProjectsPage !== "undefined")
            pages.push(ProjectsPage);
        if (typeof PlatformsPage !== "undefined")
            pages.push(PlatformsPage);
        if (typeof JobsPage !== "undefined")
            pages.push(JobsPage);
        if (typeof UsersPage !== "undefined")
            pages.push(UsersPage);
        self.pages = pages;
    };

    self.initData = function(data) {
        self.label = Helpers.getByID('alert-box');
        if (!data)
            data = arguments[0];
        cType = ['platforms', 'users', 'projects', 'jobs', 'params'];
        for (dType in cType){
            dType = cType[dType];
            if (!data[dType])
                continue;
            self[dType] = data[dType];
            self[dType].max_id = Math.max(...Object.keys(self[dType])); // ... - spread operator
        }
    };

    self.getNewID = function(type) {
        if (typeof type !== 'string')
            return;
        self[type].max_id += 1;
        return self[type].max_id
    };

    self.getNames = function(ids, array) {
        var isArray = function(arr){
            return !!arr && Object.keys(arr).length >= 1;
        };

        res = [];
        if ((!isArray(ids) && typeof ids !== 'number') || !isArray(array))
            return "";
        if (typeof ids === 'number' && ids in array) {
            return [array[ids].name];
        }
        ids.forEach((el, id, arr) => {
            res.push(array[el].name);
        });
        return res;
    };

    self.askString = function(text, defaultText) {
        return prompt(text, defaultText)
    };

    self.addItemToList = function(item, list, id) {
        if (!item)
            return;

        var list = (typeof list === "string") ? Helpers.getByID(list) : list;

        if (Helpers.isNull(list))
            return null;

        var option = document.createElement('option');
        option.value = item;
        option.innerHTML = item;
        if (!!id)
            option.setAttribute('id', id);

        list.appendChild(option);
    };

    self.getSelectedItem = function(list) {
        if ( typeof list === 'string')
            list = Helpers.getByID(list);
        if (Helpers.isNull(list))
            return;
        var indx = list.selectedIndex;
        if(indx === -1)
            return null;

        return list[indx].value;
    };

    self.replaceItemInList = function(itemIndx, newItemText, list) {
        if (Helpers.isNull(newItemText) || Helpers.isNull(list))
            return;
        list.options[itemIndx].text = newItemText;
        list.options[itemIndx].value = newItemText;
    };

    self.replaceSelectedItemInList = function(list, name/*askText, defVal*/) {
        if (typeof list === 'string')
            list = Helpers.getByID(list);
        if (list.selectedIndex === -1)
            return;
        self.replaceItemInList(list.selectedIndex, name, list);
    };

    self.removeItemFromList = function(list, itemIndex) {
        if(itemIndex === -1)
            return;
        list.options.remove(itemIndex);
    };

    self.removeSelectedItemFromList = function(list) {
        var sel = Helpers.getByID(list);
        self.removeItemFromList(sel, sel.selectedIndex)
    };

    self.saveChanges = function()  {
        self.label.style.visibility = "hidden";
        var resultingJSON = {};
        for (item in self.toSave){
            if (Object.keys(self.toSave[item]['changed']).length < 1 &&
                Object.keys(self.toSave[item]['removed']).length < 1)
                continue;

            if ($.inArray(item, resultingJSON) == -1)
                resultingJSON[item] = {
                    'removed': []
                };

            // Changed elements
            var tempEl = self.toSave[item]['changed'];
            for (id in tempEl){
                id = tempEl[id];
                resultingJSON[item][id] = General[item][id];
            }

            // Removed elemetns
            var tempEl = self.toSave[item]['removed'];
            for (id in tempEl){
                id = tempEl[id];
                Helpers.pushIfNotIn(id, resultingJSON[item]['removed']);
            }
        }
        if (Object.keys(resultingJSON) < 1)
            return;
        var saveBtn = Helpers.getByID('save_save');

        saveBtn.disabled = true;
        Helpers.doAjaxRequest('POST', './ajax/save_all', {'changed': JSON.stringify(resultingJSON)})
            .always(function(data) {
                Helpers.log(data);
                saveBtn.disabled = false;
        }).done(function(){
            self.toSave = {
                'projects': {
                    'changed':[],
                    'removed':[]
                },
                'platforms': {
                    'changed':[],
                    'removed':[]
                },
                'jobs': {
                    'changed':[],
                    'removed':[]
                },
                'users': {
                    'changed':[],
                    'removed':[]
                },
                'params': {
                    'changed': [],
                    'removed': []
                }
            };
            saveBtn.value = "OK!";
            setTimeout(function () {
                saveBtn.value = "Save";
            }, 1000);
        }).fail(function(){
            self.label.style.visibility = "visible";
        });
    };
};

// HELPER class
var Helpers = new function() {
    var self = this;

    self.log = function(message, status) {
        var statusMap = {
            0: 'color:yellow;',
            1: 'color:green;',
            2: 'color:red;'
        };
        if (!status)
            status = 0;
        console.log("%c[debug] " + message, statusMap[status]);
    };

    self.getByID = function(elID) {
        var retEl = elID;
        if (typeof elID === "string")
            retEl = document.getElementById(elID);
        if (retEl === null && DEBUG)
            Helpers.log('No such element present: ' + ((typeof elID === 'string') ? elID : "<name passed as element>"), 2);
        return retEl;
    };

    self.getCurrPage = function() {
        for (item in General.pages){
            page = General.pages[item];
            if (page.currPage())
                return page
        }
        return null;
    };

    self.isNull = function(item, silent) {
        var caller = arguments.callee.caller;
        var res = typeof item === "undefined";
        if (!res)
            res = !item;
        var status = (itm) => { return ((itm) ? 2 : 1); };
        if (DEBUG && !silent)
            self.log("isNull: from " +
                function()
                {
                    if(!caller || caller.name === "") {return "(lambda?)";}
                    else {return caller.name;}
                }() +
                " got '" + res + "'", status(res));
        return res;
    };

    self.stringContains = function(part, whole) {
        return whole.indexOf(part) > -1;
    };

    self.doAjaxRequest = function(method, url, data) {
        return $.ajax({
            url: url,
            method: method,
            data: data
        });
    };

    self.addFormControlClass = function() {
        ['input[type=text]', 'input[type=password]', 'input[type=email]', 'select', 'textarea']
            .forEach(function(sel){
            $(sel).addClass("form-control");
        });
    };

    self.filterItems = function(optionList, filter, reverted) {
        if (typeof reverted !== 'boolean')
            reverted = false;

        var filterFunc = function(item, is_hidden){
            if (reverted)
                is_hidden = !is_hidden;
            if (is_hidden){
                item.setAttribute("style", "display: none;");
            } else {
                item.removeAttribute("style");
            }
            return true;
        };

        var len = optionList.length;
        for (var i = 0; i< len; i++) {
            var el = optionList[i];

            if (el.text.indexOf(filter) > -1){
                filterFunc(el, false);
            } else {
                filterFunc(el, true);
            }
        }
    };

    self.filterByID = function(optionList, filterBy, reverted) {
        if (typeof reverted !== 'boolean')
            reverted = false;

        var filter = function(item, is_hidden){
            if (reverted)
                is_hidden = !is_hidden;
            if (is_hidden){
                item.setAttribute("style", "display: none;");
            } else {
                item.removeAttribute("style");
            }
            return true;
        };

        var multipleFBItems = (Object.keys(filterBy).length > 0);
        for (var i = 0; i < optionList.length; ++i){
            var el = optionList[i];
            if (multipleFBItems){
                $.inArray(el.id, filterBy) > -1 && filter(el, true) ||
                    filter(el, false)
            } else {
                el.id == filterBy && filter(el, true) || filter(el, false);
            }
        }
    };

    self.filterClear = function(optionList) {
        for (var i = 0; i < optionList.length; ++i){
            optionList[i].removeAttribute("style");
        }
    };

    self.addModal = function(page, callback) {
        if (!self.isNull($('#modal-data').html()))
            return;
        $('#modal-data').load('./modals/' + page + '.html', function(){
            callback();
            self.addBinds(self.getByID('modal-data'));
        });
    };

    self.addBinds = function(htmlScope) {
        var elems = ((htmlScope) ? htmlScope : document).getElementsByTagName('input');
        elems = $.merge($.makeArray(elems),
                        $.makeArray(((htmlScope) ? htmlScope : document).getElementsByTagName('button')));

        var eventMap = {
            'add': 'click',
            'edit': 'click',
            'remove': 'click',
            'save': 'click',
            'search': 'keyup'
        };

        var bindWorker = function(el, toSearch, what, event, action) {
            if (!el.matches('input[id^="' + toSearch + '_"]') &&
                !el.matches('button[id^="' + toSearch + '_"]'))
                return false;
            if (DEBUG)
                self.log("binding " + el.id + " for '" + event + "' event");
            if (self.isNull(action)){
                self.log('calling function is null: ' + el.id + ', event: ' + event, 2);
                return true;
            }
            $(el).bind(event, function() { action(what); });

            el.disabled = false;
            return true;
        };

        for (var i = 0; i < elems.length; i++) {
            var selElem = elems[i];
            var action = selElem.id.split('_')[0];
            var what = selElem.id.split('_').splice(1).join('_');
            if (action === "ask")
                continue;
            // Searching for 'Add new' buttons
            switch (what){
                case 'platform':
                case 'platform_param':
                case 'platform_used':
                    bindWorker(selElem, action, what, eventMap[action], PlatformsPage.funcMap[selElem.id]);
                    break;
                case 'job':
                case 'job_param':
                case 'job_used':
                    bindWorker(selElem, action, what, eventMap[action], JobsPage.funcMap[selElem.id]);
                    break;
                case 'project':
                case 'proj_platform':
                case 'proj_user':
                    bindWorker(selElem, action, what, eventMap[action], ProjectsPage.funcMap[selElem.id]);
                    break;
                case 'user':
                    bindWorker(selElem, action, what, eventMap[action], UsersPage.funcMap[selElem.id]);
                    break;
                case 'save':
                    bindWorker(selElem, action, what, eventMap[action], General.saveChanges);
                    break;
                case 'params':
                    Helpers.log("got modal: " + selElem.id);
                    break;
                default:
                    if (action)
                        self.log("invalid bind: " + selElem.id + ", calculated event: " + eventMap[action], 2);
                    break;
            }
        }
    };

    self.loadData = function(pages) {
        for (page in General.pages){
            page = General.pages[page];
            if(!page.currPage())
                continue;
            self.log("Page is: " + page.pageName);
            // return As current page can be only one
            // And we also need to wait for data to load
            return self.doAjaxRequest("GET", "./ajax/get_" + page.pageName, null);
        }
    };

    self.pushIfNotIn = function(data, list) {
        if($.inArray(data, list) == -1)
            list.push(data);
    };

    self.removeIfIn = function(item, list) {
        if (!$.isArray(list) || $.inArray(item, list))
            return;

        list.push(item);
    };

    self.removeIfInDict = function(item, dict) {
        if ($.inArray(item, Object.keys(dict)) == -1)
            return;

        delete dict[item];
    };

    // Local storage shit
    self.getLS = function(name) {
        return localStorage.getItem(name);
    };
    self.setLS = function(name, value) {
        localStorage.setItem(name, value);
    };
    self.delLS = function(name) {
        localStorage.removeItem(name);
    };
};


document.addEventListener('DOMContentLoaded', function(){
    Helpers.log("== Optimized for dark consoles ==", 2);
    General.setPages();
    Helpers.addBinds();
    $('[data-toggle="tooltip"]').tooltip(); // Tooltips for buttons
    // By $.when() we fight race conditions between initial data and modal windows, if any.
    $.when(Helpers.loadData(General.pages)).done(function(data){
        General.initData(data);
        page.loadData();

        if (typeof JobsPage !== "undefined" && JobsPage.currPage()){
            Helpers.addModal(JobsPage.pageName, function(){
                Helpers.addFormControlClass();
                JobsPage.modalLoaded();
            });
        } else if (typeof PlatformsPage !== "undefined" && PlatformsPage.currPage()){
            Helpers.addModal(PlatformsPage.pageName, function(){
                Helpers.addFormControlClass();
                PlatformsPage.modalLoaded();
            });
        } else {
            Helpers.addFormControlClass();
        }
    });
});
