(function(global) {
  const DB_NAME = 'osfna-native-shell';
  const STORE_NAME = 'ticket_assets';

  function withStore(mode, handler) {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        resolve(mode === 'readonly' ? null : undefined);
        return;
      }

      const request = global.indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updated_at', 'updated_at');
        }
      };

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);

        Promise.resolve(handler(store))
          .then((result) => {
            tx.oncomplete = () => {
              db.close();
              resolve(result);
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error);
            };
          })
          .catch((error) => {
            db.close();
            reject(error);
          });
      };
    });
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function putTicket(ticket) {
    if (!ticket?.id) return null;

    const payload = {
      ...ticket,
      updated_at: ticket.updated_at || new Date().toISOString(),
    };

    await withStore('readwrite', (store) => requestToPromise(store.put(payload)));
    return payload;
  }

  async function getTicket(id) {
    if (!id) return null;
    return withStore('readonly', (store) => requestToPromise(store.get(id)));
  }

  async function listTickets() {
    const tickets = await withStore('readonly', (store) => requestToPromise(store.getAll()));
    return Array.isArray(tickets)
      ? tickets.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
      : [];
  }

  async function deleteTicket(id) {
    if (!id) return;
    await withStore('readwrite', (store) => requestToPromise(store.delete(id)));
  }

  global.OSFNATicketStore = {
    putTicket,
    getTicket,
    listTickets,
    deleteTicket,
  };
})(self);
