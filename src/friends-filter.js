import renderFriendsFn from './templates/friends.hbs';
import './style.scss';

VK.init({
    apiId: 6757303
});

// Promises for loading friends lists

const login = () =>{
    return new Promise( (resolve, reject) => {
        VK.Auth.login(function(response) {
            if (response.session) {
                resolve(response)
            } else {
                reject( new Error(response.error.error_msg) );
            }
        }, 2)
    } )
};
const getFriends = () => {
    return new Promise( (resolve, reject) => {
        VK.api('friends.get', { v: '5.8', name_case: 'nom', 
            fields: 'first_name, last_name, photo_50' }, (response) => {
            if (response.error) {
                reject( new Error(response.error.error_msg) );
            } else {
                let { response: { count, items } } = response;

                resolve(items)
            }
        });
    });

};

// Lists-DnD_zones with loaded and filtered friends 
const friendsContainer = document.querySelector('.friends-container');
const friendsFilteredContainer = document.querySelector('.friends-list');
// Inputs for searching in lists
const allFriendsInput = document.querySelector('#allFriendsSearch');
const filteredFriendsInput = document.querySelector('#filteredFriendsSearch');
// Buttons for saving and clearing lists
const saveBtn = document.querySelector('.save-btn');
const clearBtn = document.querySelector('.clear-btn');
// Arrays with loaded and filtered friends. Used in DnD() and crossesAddListeners()
let allFriendsList;
let filteredFriendsList =[];

// Managing DOM-elements after loading friends 
const renderFriends = (array, container) => {
    let friendsHTML;

    if (container === friendsContainer) {
        friendsHTML = renderFriendsFn({ friends: array, svg: '/src/img/cross.svg#cross', add: true });
    } else if (container === friendsFilteredContainer) {
        friendsHTML = renderFriendsFn({ friends: array, svg: '/src/img/cross.svg#cross', add: false });
    }

    container.innerHTML = friendsHTML;
};
// Form allFriendsList array wiyh loaded friends
const formAllFriendsList = array =>{
    allFriendsList = array;
}
// Toggling buttons in friend item
const changeButton = (li) => {
    let btn = li.querySelector('button');

    btn.classList.toggle('friends__action--add');
};
// Managing arays with friend objects
const spliceAndPushFriend = (friend, from, to) => {
    let friendIndex = from.findIndex((item) => {
        return item.id === +friend.id
    });

    to.push( from.splice(friendIndex, 1)[0] )
};
// Search and filtration friends
const isMatching = (full, chunk) => {
    return full.toLowerCase().indexOf(chunk.toLowerCase()) > -1;
};

// Load friends and push them in allFriendsList array, render DOM-elements
if (!localStorage.allFilteredFriends) {
    console.log('пошел логин')
    login()
        .then( () =>{
            return getFriends();
        })
        .then( (response) =>{
            renderFriends(response, friendsContainer);
            formAllFriendsList(response);
        } )
} else {
    console.log('пошел парсинг из локал сторедж')
    allFriendsList = JSON.parse(localStorage.allFilteredFriends);
    filteredFriendsList = JSON.parse(localStorage.chosenFriends);

    renderFriends(allFriendsList, friendsContainer);
    renderFriends(filteredFriendsList, friendsFilteredContainer);
}

// Add eventListeners to zones
const DnD = (zones) =>{
    let currentDrag;

    zones.forEach(zone => {
        zone.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/html', 'dragstart');
            currentDrag = { sourse: zone, dragObject: e.target.closest('li') };
        });
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (currentDrag) {
                let targetZone = e.target.closest('ul');
                let targetItem = e.target.closest('li');

                if (targetZone !== currentDrag.sourse) {
                    if (targetItem) {
                        zone.insertBefore(currentDrag.dragObject, targetItem);
                    } else {
                        zone.appendChild(currentDrag.dragObject);

                    }
                    changeButton(currentDrag.dragObject);
                    targetZone.classList.contains('friends-container') ?
                        spliceAndPushFriend(currentDrag.dragObject, filteredFriendsList, allFriendsList) :
                        spliceAndPushFriend(currentDrag.dragObject, allFriendsList, filteredFriendsList);

                } else if (targetZone === currentDrag.sourse) {
                    zone.insertBefore(currentDrag.dragObject, targetItem)
                }
            };
            currentDrag = null;
        })
    })
}
const crossesAddListeners = (zones) => {
    zones.forEach(zone => {
        zone.addEventListener('click', (e) => { 
            let list = e.target.closest('ul');
            let btn = e.target.closest('button');
            let item = e.target.closest('li');

            if (btn) {
                if ( btn.classList.contains('friends__action--add') && list === friendsContainer) {
                    spliceAndPushFriend(item, allFriendsList, filteredFriendsList)
    
                    friendsContainer.removeChild(item);
                    btn.classList.toggle('friends__action--add');
                    friendsFilteredContainer.insertBefore(item, friendsFilteredContainer.firstElementChild);
    
                } else {
                    spliceAndPushFriend(item, filteredFriendsList, allFriendsList);
    
                    friendsFilteredContainer.removeChild(item);
                    btn.classList.toggle('friends__action--add');
                    friendsContainer.insertBefore(item, friendsContainer.firstElementChild);
    
                }
            }

        })
    })
}

DnD([friendsContainer, friendsFilteredContainer]);
crossesAddListeners([friendsContainer, friendsFilteredContainer]);

// Add event listeners to inputs
allFriendsInput.addEventListener('keyup', () => {
    const value = allFriendsInput.value;
    
    if (!value) {
        renderFriends(allFriendsList, friendsContainer);
            
        return;
    }
    
    const filteredFriends = allFriendsList.filter(friend =>
        isMatching(`${friend.first_name} ${friend.last_name}`, value)
    );
    
    renderFriends(filteredFriends, friendsContainer);
});
filteredFriendsInput.addEventListener('keyup', () => {
    const value = filteredFriendsInput.value;
    
    if (!value) {
        renderFriends(filteredFriendsList, friendsFilteredContainer);
            
        return;
    }
    
    const filteredFriends = filteredFriendsList.filter(friend =>
        isMatching(`${friend.first_name} ${friend.last_name}`, value)
    );
    
    renderFriends(filteredFriends, friendsFilteredContainer);
});
// Save lists to local storage
saveBtn.addEventListener('click', () => {
    localStorage.allFilteredFriends = JSON.stringify(allFriendsList);
    localStorage.chosenFriends = JSON.stringify(filteredFriendsList)
});
clearBtn.addEventListener('click', () => {
    delete localStorage.allFilteredFriends;
    delete localStorage.chosenFriends;
    filteredFriendsList = [];

    getFriends()
        .then( (response) =>{
            renderFriends(response, friendsContainer);
            renderFriends(filteredFriendsList, friendsFilteredContainer);
            formAllFriendsList(response);
        } )
})