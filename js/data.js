/**
 * AVFarr Network CRM - Enriched Mock Data
 */

export const FIRM_STATUS = {
    PROSPECT: 'Prospect',
    SCORED: 'Scored',
    VALIDATED: 'Validated',
    ACTIVE: 'Active'
};

export const PIPELINES = {
    STAFFING: 'Guild Staffing Pipeline',
    DEALS: 'Guild Deals Pipeline'
};

export const STAGES = {
    INTEREST: 'Interest Flagged',
    BOOKED: 'Call Booked',
    COMPLETED: 'Call Completed',
    SOURCING: 'Sourcing & Negotiation',
    SIGNED: 'Agreement Signed',
    PAYMENT: 'Payment',
    INTRODUCTIONS: 'Introductions',
    INTENT: 'Deal Intent Captured',
    MANDATE: 'Mandate Agreed',
    MATCHMAKING: 'Matchmaking',
    DUE_DILIGENCE: 'Due Diligence',
    COMPLETION: 'Completion',
    CLOSED_WON: 'Closed Won'
};

export const mockFirms = [
    {
        id: '1',
        name: 'Nexus Corp',
        contact: 'Liam Brown',
        pipeline: PIPELINES.DEALS,
        stage: STAGES.COMPLETION,
        value: 208000,
        last_contact: '2023-10-31',
        avatar: 'LB',
        tags: ['High Value', 'SaaS']
    },
    {
        id: '2',
        name: 'Future Tech',
        contact: 'Karen Lee',
        pipeline: PIPELINES.DEALS,
        stage: STAGES.INTRODUCTIONS,
        value: 75000,
        last_contact: '2023-11-02',
        avatar: 'KL',
        tags: ['New', 'Tech']
    },
    {
        id: '3',
        name: 'Innovate Solutions',
        contact: 'Jackson White',
        pipeline: PIPELINES.DEALS,
        stage: STAGES.MANDATE,
        value: 120000,
        last_contact: '2023-10-30',
        avatar: 'JW',
        tags: ['Active']
    },
    {
        id: '4',
        name: 'Auto Innovations',
        contact: 'Henry Ford',
        pipeline: PIPELINES.STAFFING,
        stage: STAGES.SIGNED,
        value: 70000,
        last_contact: '2023-10-29',
        avatar: 'HF',
        tags: ['Manufacturing']
    },
    {
        id: '5',
        name: 'Code Innovators',
        contact: 'Grace Hopper',
        pipeline: PIPELINES.STAFFING,
        stage: STAGES.SOURCING,
        value: 15000,
        last_contact: '2023-10-28',
        avatar: 'GH',
        tags: ['Development']
    },
    {
        id: '6',
        name: 'GreenLeaf Energy',
        contact: 'Bob Chen',
        pipeline: PIPELINES.STAFFING,
        stage: STAGES.INTEREST,
        value: 5000,
        last_contact: '2023-10-20',
        avatar: 'BC',
        tags: ['Sustainability', 'Mid-market']
    },
    {
        id: '7',
        name: 'Wright Architecture',
        contact: 'David Wright',
        pipeline: PIPELINES.STAFFING,
        stage: STAGES.BOOKED,
        value: 8200,
        last_contact: '2023-10-22',
        avatar: 'DW',
        tags: ['Design', 'Referral']
    },
    {
        id: '8',
        name: 'Miller Logistics',
        contact: 'Frank Miller',
        pipeline: PIPELINES.STAFFING,
        stage: STAGES.COMPLETED,
        value: 3500,
        last_contact: '2023-10-27',
        avatar: 'FM',
        tags: ['Logistics']
    },
    {
        id: '9',
        name: 'TechFlow Solutions',
        contact: 'Alice Freeman',
        pipeline: PIPELINES.STAFFING,
        stage: STAGES.PAYMENT,
        value: 12500,
        last_contact: '2023-10-25',
        avatar: 'AF',
        tags: ['SaaS', 'High Value']
    }
];
