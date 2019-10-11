/**
 * Created by evgeniy on 21.12.16.
 */
var PlatformsPage = new function() {
    var self = this;

    self.name = 'platform';
    self.pageName = self.name + 's';
    self.selectedMainID = -1;
    // Elements moved to self.loadData

    self.loadData = function() {
        self.mainSel = Helpers.getByID('select_' + self.name);

        self.nameSel = Helpers.getByID('name');
        self.fqdnSel = Helpers.getByID('fqdn');
        self.loginSel = Helpers.getByID('login');
        self.passSel = Helpers.getByID('pass');
        self.keySel = Helpers.getByID('key');
        self.lockedBySel = Helpers.getByID('select_lockedby');
        self.platformSearch = Helpers.getByID('search_platform');

        self.modalName = 'param';
        self.modalPageName = self.name + "_" + self.modalName;

        self.Events.removeAll();

        self.mainSel.options.length = 0;
        for (platfID in General.platforms)
            General.addItemToList(General.platforms[platfID].name, self.mainSel, platfID);
        for (uID in General.users)
            General.addItemToList(General.users[uID].name, self.lockedBySel, uID);
        self.lockedBySel.selectedIndex = -1;

        self.Events.addAll();
    };

    self.modalLoaded = function() {
        self['modal'] = {
            btnDisabled: true,
            paramsAllSel: Helpers.getByID('select_' + self.modalName),
            paramsUsedSel: Helpers.getByID('select_used'),
            paramQueryChck: Helpers.getByID('ask_querying'),
            paramVisChck: Helpers.getByID('ask_visible'),
            paramValueVal: Helpers.getByID('text_' + self.modalName + '_value'),
            paramQueryVal: Helpers.getByID('text_' + self.modalName + '_query')
        };

        self.Events.modal.removeAll();
        if (!General.params)
            return;
        for(param in General.params){
            param = General.params[param];
            General.addItemToList(param.name, self.modal.paramsAllSel, param.id);
        }

        self.Events.modal.addAll();
    };

    self.Events = {
        removeAll: function() {
            self.mainSel.removeEventListener('change', self.platformChanged);
            self.nameSel.removeEventListener('blur', self.paramsChanged);
            self.fqdnSel.removeEventListener('blur', self.paramsChanged);
            self.loginSel.removeEventListener('blur', self.paramsChanged);
            self.passSel.removeEventListener('blur', self.paramsChanged);
            self.lockedBySel.removeEventListener('change', self.paramsChanged);
            self.platformSearch.addEventListener('change', self.filterPlatform);
            Helpers.getByID('clear_lockedby').removeEventListener('click', function() {
                self.parentSel.selectedIndex = -1;
                self.paramsChanged.apply(self.lockedBySel, null);
            });
        },

        addAll: function() {
            self.mainSel.addEventListener('change', self.platformChanged);
            self.nameSel.addEventListener('blur', self.paramsChanged);
            self.fqdnSel.addEventListener('blur', self.paramsChanged);
            self.loginSel.addEventListener('blur', self.paramsChanged);
            self.passSel.addEventListener('blur', self.paramsChanged);
            self.keySel.addEventListener('blur', self.paramsChanged);
            self.lockedBySel.addEventListener('change', self.paramsChanged);
            self.platformSearch.addEventListener('change', self.filterPlatform);
            Helpers.getByID('clear_lockedby').addEventListener('click', function (){
                self.lockedBySel.selectedIndex = -1;
                self.paramsChanged.apply(self.lockedBySel, null);
            })
        },

        modal: {
            removeAll: function() {
                self.modal.paramsUsedSel.removeEventListener('change', self.platfUsedChanged);
                self.modal.paramQueryChck.removeEventListener('change', self.platfParamChanged);
                self.modal.paramVisChck.removeEventListener('change', self.platfParamChanged);
                self.modal.paramQueryVal.removeEventListener('blur', self.platfParamChanged);
                self.modal.paramValueVal.removeEventListener('blur', self.platfParamChanged);
                // self.modal.paramsAllSel.removeEventListener('change', self.platfParamChanged);
            },

            addAll: function() {
                self.modal.paramsUsedSel.addEventListener('change', self.platfUsedChanged);
                self.modal.paramQueryChck.addEventListener('change', self.platfParamChanged);
                self.modal.paramVisChck.addEventListener('change', self.platfParamChanged);
                self.modal.paramQueryVal.addEventListener('blur', self.platfParamChanged);
                self.modal.paramValueVal.addEventListener('blur', self.platfParamChanged);
                // self.modal.paramsAllSel.addEventListener('change', self.platfParamChanged);
            }
        }
    };

    self.currPage = function() {
        return Helpers.stringContains(self.pageName, document.location.pathname);
    };

    self.add = function() {
        var addNewItem = function(name, fqdn, login, pass, key) {
            if (!name || name === "")
                return;
            var newID = General.getNewID('platforms'); // '...' = Spread operator

            General.platforms[newID] = {
                'id': newID,
                'name': name,
                'fqdn': (!!fqdn) ? fqdn : "",
                'login': (!!login) ? login : "",
                'pass': (!!pass) ? pass : "",
                'key': (!!key) ? key : "",
                'lockedby': null,
                'params': {}
            };

            Helpers.pushIfNotIn(newID, General.toSave.platforms.changed);
            return newID;
        };

        var name = General.askString('Please tell us new '+ self.name +' name:');
        if (!name)
            return;

        var id = addNewItem(name);
        General.addItemToList(name, self.mainSel, id);
        Helpers.pushIfNotIn(id, General.toSave[self.pageName].changed);
    };

    self.remove = function() {
        var id = self.mainSel.selectedOptions[0].id;
        delete General.platforms[id];
        Helpers.pushIfNotIn(id, General.toSave.platforms.removed);

        General.removeSelectedItemFromList(self.mainSel.id);

        self.platformChanged();
    };

    self.add_param = function() {
        alert('For now you should add new parameters from "Jobs" page');
        // General.addItemToList(General.askString('Please tell us new parameter name:'), 'select_' + self.modalPageName);
    };

    self.remove_param = function() {
        var id = self.modal.paramsAllSel.selectedOptions[0].id;
        General.removeSelectedItemFromList(self.modal.paramsAllSel);
        delete General.params[id];
        Helpers.pushIfNotIn(id, General.toSave.params.removed);
    };

    self.add_used = function() {
        if (self.modal.paramsAllSel.selectedIndex <= -1 ||
            self.mainSel.selectedIndex <= -1)
            return;
        var param = self.modal.paramsAllSel.selectedOptions[0]; // 1

        self.modal.paramsAllSel.selectedIndex = -1;
        param.setAttribute("style", "display: none;");
        General.addItemToList(param.value, self.modal.paramsUsedSel, param.id);

        General.platforms[self.mainSel.selectedOptions[0].id].params[param.id] = {  // 2, 3
            id: parseInt(param.id),
            value: 'change_me',
            query: 'change_me',
            querying: false,
            visible: false
        };

        Helpers.pushIfNotIn(self.mainSel.selectedOptions[0].id, General.toSave.platforms.changed);  // 4

    };

    self.remove_used = function() {
        if (self.modal.paramsUsedSel.selectedIndex <= -1 ||
            self.mainSel.selectedIndex <= -1)
            return;

        var param = self.modal.paramsUsedSel.selectedOptions[0];
        self.modal.paramsAllSel.options.namedItem(param.id).removeAttribute("style");
        self.modal.paramsUsedSel.remove(self.modal.paramsUsedSel.selectedIndex);

        Helpers.removeIfInDict(param.id, General.platforms[self.mainSel.selectedOptions[0].id].params);
        Helpers.pushIfNotIn(self.mainSel.selectedOptions[0].id, General.toSave.platforms.changed);
    };

    /**
     * Called when main platform index changed
     */
    self.platformChanged = function() {
        if (self.mainSel.selectedIndex <= -1) {
            if (!self.modal.btnDisabled)
                self.modal.btnDisabled = Helpers.getByID('show_params').disabled = true;
            return;
        }

        self.selectedMainID = self.mainSel.selectedOptions[0].id;

        if (self.modal.btnDisabled && Helpers.getByID('show_params').disabled)
            self.modal.btnDisabled = Helpers.getByID('show_params').disabled = false;
        var item = General.platforms[self.mainSel.selectedOptions[0].id];
        self.nameSel.value = item.name;
        self.fqdnSel.value = item.fqdn;
        self.loginSel.value = item.login;
        self.passSel.value = item.pass;
        self.keySel.value = item.key;

        Helpers.filterByID(self.modal.paramsAllSel.options, Object.keys(item.params), false);

        self.modal.paramsUsedSel.options.length = 0;
        for (param in item.params){
            paramItem = item.params[param];
            General.addItemToList(General.params[paramItem.id].name, self.modal.paramsUsedSel, paramItem.id);
        }

        if (Helpers.isNull(item.lockedby)){

            self.lockedBySel.selectedIndex = -1;
            return;
        }
        $(self.lockedBySel).val(General.users[item.lockedby].name);

    };

    self.paramsChanged = function() {
        var selector = this;
        if (selector.id === "pass" && self.mainSel.selectedIndex !== -1){ // If field is password = do not set is as changed if it is empty
            var passParent = self.passSel.parentNode.parentNode;
            if (selector.value.length < 1){
                passParent.classList.add("bg-danger");
                return;
            } else if(passParent.classList.contains("bg-danger"))
                passParent.classList.remove("bg-danger");
        }


        if (self.mainSel.selectedOptions.length < 1)
            return;

        var id = self.selectedMainID;

        var sID = selector.id.split('_').pop();
        switch(sID){
            case 'lockedby':
                General[self.pageName][id][sID] = ((selector.selectedOptions.length == 0) ? null : selector.selectedOptions[0].id);
                break;
            case 'name':
                General.replaceSelectedItemInList(self.mainSel.id, selector.value);
                // break is not missed
            default:
                General[self.pageName][id][sID] = selector.value;
                break;
        }

        Helpers.pushIfNotIn(id, General.toSave.platforms.changed);
    };

    self.platfUsedChanged = function() {
        if (self.mainSel.selectedIndex <= -1 ||
            self.modal.paramsUsedSel.selectedIndex <= -1)
            return;

        var selector = this;

        var _prm = General.platforms[self.mainSel.selectedOptions[0].id].params[selector.selectedOptions[0].id];
        self.modal.paramValueVal.value = _prm.value;
        self.modal.paramQueryVal.value = _prm.query;
        self.modal.paramQueryChck.checked = _prm.querying;
        self.modal.paramVisChck.checked = _prm.visible;
    };

    self.platfParamChanged = function() {
        if (self.mainSel.selectedIndex <= -1 ||
            self.modal.paramsUsedSel.selectedIndex <= -1)
            return;

        var selector = this;

        var _prm = General.platforms[self.mainSel.selectedOptions[0].id]
            .params[self.modal.paramsUsedSel.selectedOptions[0].id];

        var _changedID = selector.id.split('_').pop();
        _prm[_changedID] = (selector.type == 'checkbox') ? selector.checked : selector.value;

        Helpers.pushIfNotIn(self.mainSel.selectedOptions[0].id, General.toSave[self.pageName].changed);
    };

    self.filterPlatform = function() {
        var selector = this;
        var fqdn = selector.value;

        var filterFunc = function(item, is_hidden){
            if (is_hidden){
                item.setAttribute("style", "display: none;");
            } else {
                item.removeAttribute("style");
            }
            return true;
        };

        var len = self.mainSel.length;
        for (var i = 0; i< len; i++) {
            var el = self.mainSel[i];
            if (General.platforms[el.id]['fqdn'].indexOf(fqdn) > -1){
                filterFunc(el, false);
            } else {
                filterFunc(el, true);
            }
        }
    };

    self.funcMap = {
        'add_platform': self.add,
        'remove_platform': self.remove,
        'add_platform_param': self.add_param,
        'remove_platform_param': self.remove_param,
        'add_platform_used': self.add_used,
        'remove_platform_used': self.remove_used
    };
};
