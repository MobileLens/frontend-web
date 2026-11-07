const STORAGE_KEY = "comparePhones";
const COMPARE_EVENT = "compare-change";

export const MAX_COMPARE_PHONES = 4;

function save(phones) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(phones));
  window.dispatchEvent(new Event(COMPARE_EVENT));
}

// For useCompareList: the list changed in this tab or another one.
export function subscribeCompare(listener) {
  window.addEventListener(COMPARE_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(COMPARE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

// The stored text of the list: it only changes when the list does, so React can compare it.
export function getCompareSnapshot() {
  return localStorage.getItem(STORAGE_KEY) || "[]";
}

export function getComparePhones() {
  const storedPhones = localStorage.getItem(STORAGE_KEY);

  if (!storedPhones) {
    return [];
  }

  try {
    return JSON.parse(storedPhones);
  } catch (error) {
    console.error("Could not read compare phones:", error);
    return [];
  }
}

export function addPhoneToCompare(phone) {
  const phones = getComparePhones();

  if (phones.length >= MAX_COMPARE_PHONES) {
    return {
      success: false,
      reason: "limit",
      phones,
    };
  }

  if (phones.some((item) => item.id === phone.id)) {
    return {
      success: false,
      reason: "already-added",
      phones,
    };
  }

  const updatedPhones = [...phones, phone];

  save(updatedPhones);

  return {
    success: true,
    phones: updatedPhones,
  };
}

export function removePhoneFromCompare(phoneId) {
  const phones = getComparePhones();

  const updatedPhones = phones.filter(
    (phone) => phone.id !== phoneId
  );

  save(updatedPhones);

  return updatedPhones;
}

export function clearComparePhones() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(COMPARE_EVENT));
}