export class RankingService {
  // Rank candidates by shared interests and recency
  async rank(userId: string, candidates: any[]): Promise<any[]> {
    return candidates.sort((a, b) => {
      const scoreA = this.calculateScore(a);
      const scoreB = this.calculateScore(b);
      return scoreB - scoreA;
    });
  }

  private calculateScore(user: any): number {
    let score = 0;
    if (user.profile?.interests?.length) score += user.profile.interests.length * 2;
    if (user.posts?.length) score += user.posts.length;
    return score;
  }
}
