-- AlterTable
ALTER TABLE `booking` ADD COLUMN `analysisId` VARCHAR(30) NULL;

-- CreateTable
CREATE TABLE `ProblemAnalysis` (
    `id` VARCHAR(30) NOT NULL,
    `clientId` VARCHAR(30) NOT NULL,
    `status` ENUM('ANALYZED', 'CONFIRMED', 'EXPIRED') NOT NULL DEFAULT 'ANALYZED',
    `categorySlug` VARCHAR(80) NOT NULL,
    `urgency` VARCHAR(10) NOT NULL,
    `summary` VARCHAR(255) NOT NULL,
    `messages` JSON NOT NULL,
    `confirmedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProblemAnalysis_clientId_status_createdAt_idx`(`clientId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Booking_analysisId_idx` ON `Booking`(`analysisId`);

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_analysisId_fkey` FOREIGN KEY (`analysisId`) REFERENCES `ProblemAnalysis`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProblemAnalysis` ADD CONSTRAINT `ProblemAnalysis_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
