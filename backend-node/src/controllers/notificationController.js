const prisma = require('../prismaClient');

const listNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json(notifications);
    } catch (error) {
        console.error('List Notifications Error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

const markAsRead = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.notification.update({
            where: { id, userId: req.user.id },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Mark As Read Error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

module.exports = {
    listNotifications,
    markAsRead
};
