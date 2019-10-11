/**
 * Created by evgeniy on 21.12.16.
 */
var ProjectsPage = new function () {
    var self = this;

    self.name = 'project';
    self.pageName = self.name + 's';
    // Element selectors moved to self.loadData

    self.loadData = function () {
        self.mainSel = Helpers.getByID('select_' + self.name);

        self.platfSel = Helpers.getByID('platfs');
        self.platfSearch = Helpers.getByID('search_proj_platform');

        self.userSel = Helpers.getByID('users');
        self.userSearch = Helpers.getByID('search_proj_user');

        self.parentSel = Helpers.getByID('select_parent');

        self.Events.removeAll();

        self.mainSel.options.length = 0;
        self.userSel.options.length = 0;
        self.platfSel.options.length = 0;
        self.parentSel.options.length = 0;

        for (projID in General.projects){
            General.addItemToList(General.projects[projID].name, self.mainSel, projID);
            General.addItemToList(General.projects[projID].name, self.parentSel, projID);
        }
        for (userID in General.users){
            General.addItemToList(General.users[userID].name, self.userSel, userID);
        }
        for (platfID in General.platforms){
            General.addItemToList(General.platforms[platfID].name, self.platfSel, platfID);
        }
        self.parentSel.selectedIndex = -1;
        self.Events.addAll();
    };

    self.currPage = function() {
        return Helpers.stringContains(self.pageName, document.location.pathname);
    };

    self.Events = {
        removeAll: function() {
            self.mainSel.removeEventListener('change', self.projectChanged);
            self.platfSel.removeEventListener('change', self.paramsChanged);
            self.userSel.removeEventListener('change', self.paramsChanged);
            self.parentSel.removeEventListener('change', self.paramsChanged);
            Helpers.getByID('clear_parent').removeEventListener('click', function(){
                self.parentSel.selectedIndex = -1;
                self.paramsChanged.apply(self.parentSel, null);
            });
        },

        addAll: function() {
            self.mainSel.addEventListener("change", self.projectChanged);
            self.platfSel.addEventListener('change', self.paramsChanged);
            self.userSel.addEventListener('change', self.paramsChanged);
            self.parentSel.addEventListener('change', self.paramsChanged);
            Helpers.getByID('clear_parent').addEventListener('click', function(){
                self.parentSel.selectedIndex = -1;
                self.paramsChanged.apply(self.parentSel, null);
            });
        }
    };

    self.add = function() {
        var addNewItem = function(name, platfs, users) {
            if (!name || name === "")
                return;
            var newID = General.getNewID('projects');

            General.projects[newID] = {
                'id': newID,
                'name': name,
                'desc': "",
                'parent': null,
                'platfs': (!!platfs && platfs.constructor === Array) ? platfs : null,
                'users': (!!users && users.constructor === Array) ? users : null
            };

            Helpers.pushIfNotIn(newID, General.toSave.projects.changed);

            return newID;
        };

        var name = General.askString('Please tell us new '+ self.name +' name:');
        if (!name)
            return;

        var id = addNewItem(name);
        General.addItemToList(name, self.mainSel, id);
        Helpers.pushIfNotIn(id, General.toSave[self.pageName].changed);
    };

    self.edit = function() {
        var selItem = self.mainSel.selectedOptions[0];
        var newName = General.askString('Please tell us new '+ self.name +' name:',
                    selItem.value);
        if (!newName || newName.length < 1)
            return;

        General[self.pageName][selItem.id].name = newName;
        Helpers.pushIfNotIn(selItem.id, General.toSave[self.pageName].changed);
        General.replaceSelectedItemInList(self.mainSel.id, newName);
    };

    self.remove = function() {
        if (self.mainSel.selectedIndex == -1)
            return;
        delete General.projects[self.mainSel.selectedOptions[0].id];
        Helpers.pushIfNotIn(self.mainSel.selectedOptions[0].id, General.toSave.projects.removed);

        General.removeSelectedItemFromList(self.mainSel);
    };

    self.filterPlatforms = function() {
        Helpers.filterItems(self.platfSel.options, self.platfSearch.value);
    };

    self.filterUsers = function() {
        Helpers.filterItems(self.userSel.options, self.userSearch.value);
    };

    self.projectChanged = function() {
        if (self.mainSel.selectedIndex == -1 )
            return;
        var itemID = self.mainSel.selectedOptions[0].id;
        $(self.userSel).val(General.getNames(General.projects[itemID].users, General.users));
        $(self.platfSel).val(General.getNames(General.projects[itemID].platfs, General.platforms));

        // Filter out selected project so user could not select it
        Helpers.filterItems(self.parentSel.options, self.mainSel.value, true);
        $(self.parentSel).val(General.getNames(General.projects[itemID].parent, General.projects));
    };

    self.paramsChanged = function() {
        var selector = this;
        if (self.mainSel.selectedOptions.length < 1)
            return;

        var getValue = function(name){
            if (name == 'parent'){
                if (self.parentSel.selectedIndex === -1)
                    return null;
                return self.parentSel.selectedOptions[0].id;
            } else {
                return $(selector).children(':selected').map(function (i, el) {
                    var res = [];
                    res.push(el.id);
                    return res;
                }).get();
            }
        };

        var id = self.mainSel.selectedOptions[0].id;

        pName = selector.id.split('_').pop();

        General[self.pageName][id][pName] = getValue(pName);
        Helpers.pushIfNotIn(id, General.toSave.projects.changed);
    };

    self.funcMap = {
        'add_project': self.add,
        'edit_project': self.edit,
        'remove_project': self.remove,
        'search_proj_platform': self.filterPlatforms,
        'search_proj_user': self.filterUsers
    };

};