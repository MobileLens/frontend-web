const STORAGE_KEY = "comparePhones";
const MAX_COMPARE_PHONES = 4;

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

export function isPhoneInCompare(phoneId) {
  const phones = getComparePhones();

  return phones.some((phone) => phone.id === phoneId);
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

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPhones));

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

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPhones));

  return updatedPhones;
}

export function clearComparePhones() {
  localStorage.removeItem(STORAGE_KEY);
}