/**
 * Created by evgeniy on 21.12.16.
 */
var UsersPage = new function () {
    var self = this;

    self.name = 'user';
    self.pageName = self.name + 's';
    self.selectedMainID = -1;

    self.loadData = function () {
        self.mainSel = Helpers.getByID('select_user');
        self.mainSearch = Helpers.getByID('search_' + self.name);
        self.nameText = Helpers.getByID('name');
        self.passText = Helpers.getByID('pass');
        self.emailText = Helpers.getByID('email');

        self.askActiveChkBox = Helpers.getByID('ask_active');
        self.askStaffChkBox = Helpers.getByID('ask_staff');

        self.Events.removeAll();

        self.mainSel.options.length = 0;
        for (uID in General.users)
            General.addItemToList(General.users[uID].name, self.mainSel, uID);

        self.Events.addAll();

    };

    self.currPage = function() {
        return Helpers.stringContains(self.pageName, document.location.pathname);
    };

    self.Events = {
        removeAll: function() {
            self.mainSel.removeEventListener('change', self.userChanged);

            self.nameText.removeEventListener('blur', self.paramChanged);
            self.passText.removeEventListener('blur', self.paramChanged);
            self.emailText.removeEventListener('blur', self.paramChanged);

            self.askActiveChkBox.removeEventListener('change', self.paramChanged);
            self.askStaffChkBox.removeEventListener('change', self.paramChanged);
        },

        addAll: function() {
            self.mainSel.addEventListener('change', self.userChanged);

            self.nameText.addEventListener('blur', self.paramChanged);
            self.passText.addEventListener('blur', self.paramChanged);
            self.emailText.addEventListener('blur', self.paramChanged);

            self.askActiveChkBox.addEventListener('change', self.paramChanged);
            self.askStaffChkBox.addEventListener('change', self.paramChanged);
        }
    };

    self.add = function() {
        var addNewItem = function(name, pass, email) {
            var uID = General.getNewID('users');
            if (!name)
                return;
            General.users[uID] = {
                'id': uID,
                'name': name,
                'pass': (!!pass) ? pass : '1111',
                'email': (!!email) ? email : name + '@' + General.domain,
                'active': true,
                'staff': false
            };
            return uID;
        };

        var name = General.askString('Please tell us new '+ self.name +' name:\n\nNote: password defaults to 1111');
        if (!name)
            return;

        var id = addNewItem(name);
        General.addItemToList(name, self.mainSel, id);
        Helpers.pushIfNotIn(id, General.toSave[self.pageName].changed);
    };

    self.remove = function() {
        if (self.mainSel.selectedIndex === -1)
            return;
        var uID = self.mainSel.selectedOptions[0].id;
        delete General.users[uID];
        General.removeSelectedItemFromList(self.mainSel);
        Helpers.pushIfNotIn(uID, General.toSave.users.removed);

        self.nameText.value = self.passText.value = self.emailText.value = "";
        self.askActiveChkBox.checked = self.askStaffChkBox.checked = false;
    };

    self.filterUser = function() {
        Helpers.filterItems(self.mainSel.options, self.mainSearch.value);
    };

    self.userChanged = function() {
        if (self.mainSel.selectedIndex === -1)
            return;

        self.selectedMainID = self.mainSel.selectedOptions[0].id;

        var uID = self.mainSel.selectedOptions[0].id;
        var user = General.users[uID];

        self.nameText.value = user.name;
        self.passText.value = "";
        self.emailText.value = user.email;
        self.askActiveChkBox.checked = user.active;
        self.askStaffChkBox.checked = user.staff;
    };

    self.paramChanged = function() {
        if (self.mainSel.selectedIndex === -1)
            return;
        var selector = this;
        var vType = selector.id.split('_').pop();

        var uID = self.selectedMainID;

        switch(vType){
            case 'active':
            case 'staff':
                General[self.pageName][uID][vType] = selector.checked;
                break;
            case 'name':
                if (!selector.value)
                    return;
                General.replaceSelectedItemInList(self.mainSel, selector.value);
                // break is not missed, it should hit default section
            default:
                General[self.pageName][uID][vType] = selector.value;
                break;
        }
        Helpers.pushIfNotIn(uID, General.toSave[self.pageName].changed);
    };

    self.funcMap = {
        'search_user': self.filterUser,
        'add_user': self.add,
        'remove_user': self.remove
    };
};