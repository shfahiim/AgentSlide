# Performance Optimization - REVERTED

## Current Status: Single API Call (Free Tier Friendly)

### Why Reverted?

The batched generation was **too aggressive for free tier users**:
- Increased API calls from 4-7 to 7-10
- Hit rate limits on Gemini free tier (15 req/min)
- More overhead and complexity

### Current Implementation:

**Single API call for all slides:**
- Intake: 1 call
- Planning: 1 call
- Research: 1 call
- Generation: 1 call (all slides at once)
- Asset fixes: 0-3 calls (if needed)

**Total: 4-7 API calls per deck**

### Performance:

**10-slide deck:**
- Time: ~76 seconds
- API calls: 4-7 total
- Free tier safe: ✅ (well under 15/min limit)

### Trade-offs:

**Pros:**
- ✅ Minimal API calls (free tier friendly)
- ✅ Simple, reliable
- ✅ No rate limit issues
- ✅ Lower complexity

**Cons:**
- ⚠️ Slower (76s vs 36s with batching)
- ⚠️ No parallelism
- ⚠️ User waits longer

## Future Optimization (Optional)

For **paid tier users**, batched generation can be re-enabled via config:
```env
ENABLE_BATCHED_GENERATION=true
SLIDE_GENERATION_BATCH_SIZE=3
```

This would require:
1. Feature flag in orchestrator
2. Conditional batching logic
3. Rate limit detection and fallback
