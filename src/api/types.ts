import type { components } from "./schema";

// Animal types
export type Animal =
  components["schemas"]["GetV1AnimalsPositiveResponse"]["data"]["result"][number];

export type AnimalType = Animal["type"];
export type AnimalSex = Animal["sex"];
export type DeathReason = NonNullable<Animal["deathReason"]>;

export type AnimalDetail =
  components["schemas"]["GetV1AnimalsByIdAnimalIdPositiveResponse"]["data"];

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

export type SponsorshipDetail =
  components["schemas"]["GetV1SponsorshipsByIdSponsorshipIdPositiveResponse"]["data"];

export type SponsorshipProgram =
  components["schemas"]["GetV1SponsorshipProgramsPositiveResponse"]["data"]["result"][number];

// Payment types
export type Payment =
  components["schemas"]["GetV1PaymentsPositiveResponse"]["data"]["result"][number];

// Payment without contact (for contact-specific queries)
export type ContactPayment =
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

// Field calendar types
export type Plot =
  components["schemas"]["GetV1PlotsPositiveResponse"]["data"]["result"][number];

export type PlotDetail =
  components["schemas"]["GetV1PlotsByIdPlotIdPositiveResponse"]["data"];

export type CropRotation =
  components["schemas"]["GetV1CropRotationsPositiveResponse"]["data"]["result"][number];

export type Tillage =
  components["schemas"]["GetV1TillagesPositiveResponse"]["data"]["result"][number];

export type Harvest =
  components["schemas"]["GetV1HarvestsPositiveResponse"]["data"]["result"][number];

export type FertilizerApplication =
  components["schemas"]["GetV1FertilizerApplicationsPositiveResponse"]["data"]["result"][number];

export type CropProtectionApplication =
  components["schemas"]["GetV1CropProtectionApplicationsPositiveResponse"]["data"]["result"][number];

export type HarvestPreset =
  components["schemas"]["GetV1HarvestsPresetsPositiveResponse"]["data"]["result"][number];

export type FertilizerApplicationPreset =
  components["schemas"]["GetV1FertilizerApplicationsPresetsPositiveResponse"]["data"]["result"][number];

export type CropProtectionApplicationPreset =
  components["schemas"]["GetV1CropProtectionApplicationsPresetsPositiveResponse"]["data"]["result"][number];

export type Crop =
  components["schemas"]["GetV1CropsPositiveResponse"]["data"]["result"][number];

export type CropCategory = Crop["category"];

export const CROP_CATEGORIES: CropCategory[] = [
  "grass",
  "grain",
  "vegetable",
  "fruit",
  "other",
];

export type CropFamily =
  components["schemas"]["GetV1CropsFamiliesPositiveResponse"]["data"]["result"][number];

export type Fertilizer =
  components["schemas"]["GetV1FertilizersPositiveResponse"]["data"]["result"][number];

export type FertilizerType = Fertilizer["type"];
export type FertilizerUnit = Fertilizer["unit"];

export const FERTILIZER_TYPES: FertilizerType[] = ["mineral", "organic"];
export const FERTILIZER_UNITS: FertilizerUnit[] = ["l", "kg", "dt", "t"];

export type CropProtectionProduct =
  components["schemas"]["GetV1CropProtectionProductsPositiveResponse"]["data"]["result"][number];

export type CropProtectionProductUnit = CropProtectionProduct["unit"];

export const CROP_PROTECTION_PRODUCT_UNITS: CropProtectionProductUnit[] = [
  "ml",
  "l",
  "g",
  "kg",
];

export type TillageAction = Tillage["action"];

export const TILLAGE_ACTIONS: TillageAction[] = [
  "plowing",
  "tilling",
  "harrowing",
  "rolling",
  "rotavating",
  "weed_harrowing",
  "hoeing",
  "flame_weeding",
  "custom",
];

// Herd types
export type Herd =
  components["schemas"]["GetV1AnimalsHerdsPositiveResponse"]["data"]["result"][number];

// Outdoor Journal types
export type OutdoorJournalData =
  components["schemas"]["GetV1AnimalsOutdoorJournalPositiveResponse"]["data"];

export type AnimalUsage = Animal["usage"];

// Wiki types
export type WikiEntry =
  components["schemas"]["GetV1WikiPositiveResponse"]["data"]["result"][number];
export type WikiTranslation = WikiEntry["translations"][number];
export type WikiCategory = WikiEntry["category"];
export type WikiCategoryTranslation = WikiCategory["translations"][number];
export type WikiImage = WikiEntry["images"][number];
export type WikiEntryTag = WikiEntry["tags"][number];
export type WikiTag = WikiEntryTag["tag"];
export type WikiEntryStatus = WikiEntry["status"];
export type WikiEntryVisibility = WikiEntry["visibility"];

export type WikiChangeRequest =
  components["schemas"]["GetV1WikiMyChangeRequestsPositiveResponse"]["data"]["result"][number];
export type WikiChangeRequestTranslation =
  WikiChangeRequest["translations"][number];
export type WikiChangeRequestStatus = WikiChangeRequest["status"];
export type WikiChangeRequestType = WikiChangeRequest["type"];

export type WikiReviewItem =
  components["schemas"]["GetV1WikiReviewQueuePositiveResponse"]["data"]["result"][number];

// Full change request detail (byId) — includes nullable embedded entry
export type WikiChangeRequestDetail =
  components["schemas"]["GetV1WikiChangeRequestsByIdChangeRequestIdPositiveResponse"]["data"];

export type WikiChangeRequestNote =
  components["schemas"]["GetV1WikiChangeRequestsByIdChangeRequestIdNotesPositiveResponse"]["data"]["result"][number];

// Task types
export type Task =
  components["schemas"]["GetV1TasksPositiveResponse"]["data"]["result"][number];
export type TaskDetail =
  components["schemas"]["GetV1TasksByIdTaskIdPositiveResponse"]["data"];
export type TaskLink = TaskDetail["links"][number];
export type TaskLinkType = TaskLink["linkType"];
export type TaskStatus = Task["status"];
export type TaskChecklistItem = TaskDetail["checklistItems"][number];
export type TaskRecurrence = NonNullable<Task["recurrence"]>;

export type FarmUser =
  components["schemas"]["GetV1UsersPositiveResponse"]["data"]["result"][number];
