const { getUserId } = require('../utils');

const newLinkSubscribe = (root, args, ctx, info) => {
	return ctx.prisma.$subscribe.link({ mutation_in: ['CREATED'] }).node();
};

const newLink = {
	subscribe: newLinkSubscribe,
	resolve: payload => {
		return payload;
	}
};

const vote = async (root, args, ctx, info) => {
	const userId = getUserId(ctx);

	const linkExists = await ctx.prisma.$exists.vote({
		user: { id: userId },
		link: { id: args.linkId }
	});

	if (linkExists) {
		throw new Error(`Already voted for link: ${args.linkId}`);
	}

	return ctx.prisma.createVote({
		user: { connect: { id: userId } },
		link: { connect: { id: args.linkId } }
	});
};

const newVoteSubscribe = (root, args, ctx, info) => {
	return ctx.prisma.$subscribe.vote({ mutation_in: ['CREATED'] }).node();
};

const newVote = {
	subscribe: newVoteSubscribe,
	resolve: payload => {
		return payload;
	}
};

const feed = async (root, args, ctx, info) => {
	const where = args.filter
		? {
				OR: [
					{ description_contains: args.filter },
					{ url_contains: args.filter }
				]
		  }
		: {};
	const links = await ctx.prisma.links({
		where,
		skip: args.skip,
		first: args.first,
		orderBy: args.orderBy
	});

	const count = await ctx.prisma
		.linksConnection({
			where
		})
		.aggregate()
		.count();
	return { links, count };
};

module.exports = {
	Query: {
		feed
	},
	Mutation: {
		post: (root, args, ctx) => {
			const userId = getUserId(ctx);
			return ctx.prisma.createLink({
				url: args.url,
				description: args.description,
				postedBy: { connect: { id: userId } }
			});
		},
		vote
	},
	Subscription: {
		newLink,
		newVote
	},
	Link: {
		postedBy(parent, args, ctx) {
			return ctx.prisma.link({ id: parent.id }).postedBy();
		},
		votes(parent, args, ctx) {
			return ctx.prisma.link({ id: parent.id }).votes();
		}
	},
	Vote: {
		link(parent, args, ctx) {
			return ctx.prisma.vote({ id: parent.id }).link();
		},
		user(parent, args, ctx) {
			return ctx.prisma.vote({ id: parent.id }).user();
		}
	}
};
