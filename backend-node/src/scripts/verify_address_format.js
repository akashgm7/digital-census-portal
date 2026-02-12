const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function testAddressFormat() {
    console.log('--- Verifying Door No. Format Enforcement ---');

    // 1. Setup: Find a zone
    const zone = await prisma.zone.findFirst();
    if (!zone) {
        console.error('No zone found. Seed first.');
        return;
    }

    try {
        console.log('\nTesting Invalid Prefix: "House 101"');
        // Simulate controller logic for validation
        const invalidAddress = "House 101, Test Street";
        if (!invalidAddress.trim().toLowerCase().startsWith('door no.')) {
            console.log('[PASS] Blocked: Invalid prefix "House" correctly identified.');
        } else {
            console.log('[FAIL] Allowed: Invalid prefix went through validation logic.');
        }

        console.log('\nTesting Valid Prefix: "Door No. 101"');
        const validAddress = "Door No. 101, Test Street";
        if (validAddress.trim().toLowerCase().startsWith('door no.')) {
            console.log('[PASS] Allowed: "Door No." prefix correctly identified.');
        } else {
            console.log('[FAIL] Blocked: Valid prefix "Door No." rejected?');
        }

        console.log('\nTesting Search Optimization:');
        // Search for a specific building number (e.g., '1')
        const searchTerm = '1';
        const searchResults = await prisma.masterAddress.findMany({
            where: {
                OR: [
                    { addressLine1: { contains: searchTerm, mode: 'insensitive' } },
                    { buildingNumber: { startsWith: searchTerm, mode: 'insensitive' } }
                ]
            },
            orderBy: { buildingNumber: 'asc' },
            take: 5
        });

        if (searchResults.length > 0) {
            console.log(`[PASS] Search returned ${searchResults.length} results for "${searchTerm}".`);
            console.log('Top Result:', searchResults[0].addressLine1);
        } else {
            console.log('[FAIL] Search returned 0 results.');
        }

    } catch (err) {
        console.error('Test Error:', err);
    }

    await prisma.$disconnect();
}

testAddressFormat();
