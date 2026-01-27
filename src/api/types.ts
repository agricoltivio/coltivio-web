import type { components } from "./schema";

// Animal types
export type Animal =
  components["schemas"]["GetV1AnimalsPositiveResponse"]["data"]["result"][number];

export type AnimalType = Animal["type"];
export type AnimalSex = Animal["sex"];
export type DeathReason = NonNullable<Animal["deathReason"]>;

export const ANIMAL_TYPES: AnimalType[] = [
  "goat",
  "sheep",
  "cow",
  "horse",
  "donkey",
  "pig",
  "deer",
];

export const ANIMAL_SEX_OPTIONS: AnimalSex[] = ["male", "female"];

export const DEATH_REASONS: DeathReason[] = ["died", "slaughtered"];

// Ear tag types
export type EarTag =
  components["schemas"]["GetV1EarTagsPositiveResponse"]["data"]["result"][number];

export type AvailableEarTag =
  components["schemas"]["GetV1EarTagsAvailablePositiveResponse"]["data"]["result"][number];

// Contact types
export type Contact =
  components["schemas"]["GetV1ContactsPositiveResponse"]["data"]["result"][number];

export type PreferredCommunication = NonNullable<
  Contact["preferredCommunication"]
>;

export const PREFERRED_COMMUNICATION_OPTIONS: PreferredCommunication[] = [
  "email",
  "phone",
  "whatsapp",
];

// Sponsorship types
export type Sponsorship =
  components["schemas"]["GetV1SponsorshipsPositiveResponse"]["data"]["result"][number];

export type SponsorshipProgram =
  components["schemas"]["GetV1SponsorshipProgramsPositiveResponse"]["data"]["result"][number];

// Payment types
export type Payment =
  components["schemas"]["GetV1ContactsByIdContactIdPaymentsPositiveResponse"]["data"]["result"][number];

export type PaymentMethod = Payment["method"];

export const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "twint",
  "card",
  "other",
];

// Product types
export type Product =
  components["schemas"]["GetV1ProductsPositiveResponse"]["data"]["result"][number];

export type ProductCategory = Product["category"];
export type ProductUnit = Product["unit"];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "meat",
  "vegetables",
  "dairy",
  "eggs",
  "other",
];

export const PRODUCT_UNITS: ProductUnit[] = [
  "kg",
  "g",
  "piece",
  "bunch",
  "liter",
];

// Order types
export type Order =
  components["schemas"]["GetV1OrdersPositiveResponse"]["data"]["result"][number];

export type OrderDetail =
  components["schemas"]["GetV1OrdersByIdOrderIdPositiveResponse"]["data"];

export type OrderStatus = Order["status"];

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "fulfilled",
  "cancelled",
];

// Drug types
export type Drug =
  components["schemas"]["GetV1DrugsPositiveResponse"]["data"]["result"][number];

export type DrugTreatment = Drug["drugTreatment"][number];

// Treatment types
export type Treatment =
  components["schemas"]["GetV1TreatmentsPositiveResponse"]["data"]["result"][number];

export type TreatmentDetail =
  components["schemas"]["GetV1TreatmentsByIdTreatmentIdPositiveResponse"]["data"];

export type AnimalTreatment =
  components["schemas"]["GetV1AnimalsByIdAnimalIdTreatmentsPositiveResponse"]["data"]["result"][number];
