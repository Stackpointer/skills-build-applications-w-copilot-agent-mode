import { Activity, Team, User, Workout } from '../models/index.js';
import { Types } from 'mongoose';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const badRequest = (message: string) => Object.assign(new Error(message), { status: 400 });
  if (!input || typeof input !== 'object') throw badRequest('Activity input is required');

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (typeof userId !== 'string' || !Types.ObjectId.isValid(userId)) throw badRequest('A valid userId is required');
  if (typeof teamId !== 'string' || !Types.ObjectId.isValid(teamId)) throw badRequest('A valid teamId is required');
  if (typeof type !== 'string' || !type.trim()) throw badRequest('Activity type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) throw badRequest('Activity minutes must be a number');

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) throw badRequest('The referenced user and team must exist');

  return Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const badRequest = (message: string) => Object.assign(new Error(message), { status: 400 });
  if (!input || typeof input !== 'object') throw badRequest('Team input is required');

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) throw badRequest('Team name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw badRequest('Team mascot is required');
  if (!Array.isArray(members) || members.some((member) => typeof member !== 'string' || !Types.ObjectId.isValid(member))) {
    throw badRequest('Team members must be valid user IDs');
  }

  const existingMembers = await User.find({ _id: { $in: members } }).select('_id').lean();
  if (existingMembers.length !== members.length) throw badRequest('Every team member must exist');

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members });
}

export async function getLeaderboard() {
  const scores = await Activity.aggregate<{ teamName: string; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    {
      $lookup: {
        from: Team.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'team',
      },
    },
    { $unwind: '$team' },
    { $sort: { totalPoints: -1 } },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
  ]);

  return scores.map((score, index) => ({ ...score, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).select('_id fitnessGoal').lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const latestActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).select('type').lean();
  const activityFocus = latestActivity?.type === 'run' ? 'endurance' : latestActivity?.type;
  const focus = activityFocus ?? user.fitnessGoal;
  let workouts = await Workout.find({ focus }).lean();
  let reason = latestActivity
    ? `Recommended based on your ${latestActivity.type} activity.`
    : `Recommended for your ${user.fitnessGoal} fitness goal.`;

  if (latestActivity && workouts.length === 0) {
    workouts = await Workout.find({ focus: user.fitnessGoal }).lean();
    reason = `Recommended for your ${user.fitnessGoal} fitness goal.`;
  }

  return workouts.map((workout) => ({ ...workout, reason }));
}

export { User };
