$(() => {
    const conversation = $("#conversation-body");
    const messageInput = $("#message");
    const messageForm = $("#message-form");
    const submitButton = $("#submit-button");
    const nameInput = $("#name");
    const alivesCount = $("#alives-count");
    const alivesList = $("#alives-list");
    const user = nameInput.val();
    const roomContainer = $("#room-container");

    const alreadyRenderedMessagesIds = []

    const renderMessage = (message) => {
        if (alreadyRenderedMessagesIds.includes(parseInt(message.id))) {
            return;
        }
        const date = new Date(Date.parse(message.date_envoi));
        const dateString = date.toLocaleDateString("fr-FR", {
            month: "numeric",
            day: "numeric",
        });

        const hoursString = date.toLocaleTimeString("fr-FR", {
            timeStyle: "short",
        });

        let alreadyOneGif = false;

        const formattedMessage = message.contenu.split(" ").map((word) => {
            if (word.startsWith("https://media.giphy.com/media/")) {
                if (alreadyOneGif) {
                    return "";
                }
                const idGif = word
                    .replaceAll("https://media.giphy.com/media/", "")
                    .replaceAll("/giphy.gif", "")
                    .split("/").pop();
                alreadyOneGif = true;
                return `<iframe style="pointer-events: none;" src="https://giphy.com/embed/${idGif}" allowFullScreen /> <br>`;
            }
            return word;
        });

        alreadyRenderedMessagesIds.push(parseInt(message.id));

        const formattedDate = `le ${dateString} à ${hoursString}`;

        const messageElement = $(`<div data-chat-id='${message.id}' class="message ${user === message.auteur ? "me" : "other"}" >
            <p class="message-author" title="${message.auteur}">${message.auteur}</p>
            <div class="message-content">${formattedMessage.join(" ")}</div>
            <p class="message-time" title="${formattedDate}">${formattedDate}</p>
        </div>`);
        conversation.append(messageElement);

        conversation.scrollTop(conversation.prop("scrollHeight"));
    }

    const fetchMessages = (roomID) => {
        $.ajax({
            url: "./recuperer.php",
            method: "GET",
            data: {
                room_id: roomID ?? roomContainer.find(".active").data("room-id")
            }
        }).done((response) => {
            const messages = JSON.parse(response).data;
            messages.forEach(renderMessage);
        });
    }

    const renderAlives = (alives) => {
        // ajout des nouveaux vivants
        alives.forEach((alive) => {
            if (alivesList.find(`[data-username="${alive.username}"]`).length > 0) {
                return;
            }

            alivesList.append($(`<div class="alive" data-username="${alive.username}">
                <img src="${alive.avatar}" alt="">
                <p>${alive.username}</p>
            </div>`))
        })

        // suppression des morts
        alivesList.find(".alive").each((index, alive) => {
            const aliveUsername = $(alive).data("username");
            if (!alives.find((alive) => alive.username === aliveUsername)) {
                $(alive).remove();
            }
        });
    }
    const fecthAlives = () => {
        $.ajax({
            url: "./alives.php",
            method: "GET"
        }).done((response) => {
            const alives = JSON.parse(response)
            alivesCount.text(alives.count)

            renderAlives(alives.users)
        })
    }

    const roomClickHandler = (event) => {
        const roomElement = $(event.currentTarget);
        const roomId = roomElement.data("room-id");

        roomContainer.find(".active").removeClass("active");
        roomElement.addClass("active");

        conversation.empty();
        alreadyRenderedMessagesIds.length = 0;
        fetchMessages(roomId);
    }

    messageForm.submit((event) => {
        event.preventDefault();

        messageInput.prop("disabled", true);
        submitButton.prop("disabled", true);
        submitButton.addClass("loading");

        if (nameInput.val().trim() === "") {
            window.alert("Rentre ton nom gros débile");
            return;
        }

        if (messageInput.val().trim() === "") {
            window.alert("Tu n'as pas mis de message abruti");
            return;
        }

        const auteur = nameInput.val().trim();
        const contenu = messageInput.val().trim();

        $.ajax({
            url: "./enregistrer.php",
            method: "GET",
            data: {
                auteur,
                contenu,
                room_id: roomContainer.find(".active").data("room-id")
            }
        }).done((response) => {
            const message = JSON.parse(response);
            renderMessage(message);
            messageInput.val("");
            nameInput.prop("disabled", false);
        }).fail((error) => {
            modal.fire("Erreur", "Un erreur de communication avec le serveur est servenue", "error")
        }).always(() => {
            messageInput.prop("disabled", false);
            submitButton.removeClass("loading");
            submitButton.prop("disabled", false);
            messageInput.val("");
        });
    })

    $.ajax({
        url: "./rooms.php",
        method: "GET",
    }).done((response) => {
        const payload = JSON.parse(response);
        payload.rooms.forEach((room, index) => {
            const roomElement = $(`<div class="room-item ${index === 0 ? 'active' : ''}" data-room-id="${room.id}">
                <img src="https://ui-avatars.com/api/?bold=true&name=${room.name}&background=6A1B9A&color=F5F5F5" alt="">
                <p>${room.name}</p>
            </div>`);

            roomElement.click(roomClickHandler)
            roomContainer.append(roomElement);
        });

        // on commence à récupérer les messages de la room active (ici la première)
        fetchMessages();
        setInterval(fetchMessages, 4000);
    });

    // On récupère les connectés
    setInterval(fecthAlives, 8000);
    fecthAlives();
})