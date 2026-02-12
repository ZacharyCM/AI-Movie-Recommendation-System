from pydantic import BaseModel, ConfigDict


class MovieResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    overview: str
    poster_path: str | None
    backdrop_path: str | None
    release_date: str
    vote_average: float
    vote_count: int
    genre_ids: list[int]


class GenreResponse(BaseModel):
    id: int
    name: str


class CastMemberResponse(BaseModel):
    id: int
    name: str
    character: str
    profile_path: str | None
    order: int


class VideoResponse(BaseModel):
    id: str
    key: str
    name: str
    site: str
    type: str


class CreditsResponse(BaseModel):
    cast: list[CastMemberResponse]


class VideosResponse(BaseModel):
    results: list[VideoResponse]


class MovieDetailResponse(MovieResponse):
    runtime: int | None
    genres: list[GenreResponse]
    tagline: str | None
    credits: CreditsResponse
    videos: VideosResponse


class PaginatedMovieResponse(BaseModel):
    page: int
    results: list[MovieResponse]
    total_pages: int
    total_results: int
